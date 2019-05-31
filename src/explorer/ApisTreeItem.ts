/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "azure-arm-apimanagement";
import { window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, createTreeItemsWithErrorHandling, DialogResponses, IParsedError, parseError, UserCancelledError } from "vscode-azureextensionui";
import { topItemCount } from "../constants";
import { localize } from "../localize";
import { IOpenApiImportObject } from "../openApi/OpenApiImportObject";
import { processError } from "../utils/errorUtil";
import { nodeUtils } from "../utils/nodeUtils";
import { ApiTreeItem } from "./ApiTreeItem";
import { ApiVersionSetTreeItem } from "./ApiVersionSetTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class ApisTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return nodeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementApis';
    public label: string = "APIs";
    public contextValue: string = ApisTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azApim.Api', 'API');
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzureTreeItem<IServiceTreeRoot>[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const apiCollection: ApiManagementModels.ApiCollection = this._nextLink === undefined ?
            await this.root.client.api.listByService(this.root.resourceGroupName, this.root.serviceName, { expandApiVersionSet: true, top: topItemCount }) :
            await this.root.client.api.listByServiceNext(this._nextLink);

        this._nextLink = apiCollection.nextLink;

        const versionSetMap: Map<string, ApiVersionSetTreeItem> = new Map<string, ApiVersionSetTreeItem>();

        return await createTreeItemsWithErrorHandling(
            this,
            apiCollection,
            "invalidApiManagementApi",
            async (api: ApiManagementModels.ApiContract) => {
                if (api.apiVersionSetId && api.apiVersionSet) {
                    let apiVersionSetTreeItem = versionSetMap.get(api.apiVersionSetId);
                    if (!apiVersionSetTreeItem) {
                        apiVersionSetTreeItem = new ApiVersionSetTreeItem(this, api);
                        versionSetMap.set(api.apiVersionSetId, apiVersionSetTreeItem);
                        return apiVersionSetTreeItem;
                    } else {
                        apiVersionSetTreeItem.addApiToSet(api);
                        return undefined;
                    }
                } else {
                    return await ApiTreeItem.create(this, api);
                }
            },
            (api: ApiManagementModels.ApiContract) => {
                return api.name;
            });
    }

    public async createChildImpl(showCreatingTreeItem: (label: string) => void, userOptions?: { apiName: string, document?: IOpenApiImportObject }): Promise<ApiTreeItem> {
        if (userOptions && userOptions.document && userOptions.apiName) {
            const apiName = userOptions.apiName;
            showCreatingTreeItem(apiName);
            try {
                userOptions.document.info.title = apiName;

                let apiExists: boolean = true;
                try {
                    await this.root.client.api.get(this.root.resourceGroupName, this.root.serviceName, apiName);
                } catch (error) {
                    const err: IParsedError = parseError(error);
                    if (err.errorType.toLocaleLowerCase() === 'notfound' || err.errorType.toLowerCase() === 'resourcenotfound') {
                        apiExists = false;
                    }
                }

                if (apiExists) {
                    const overwriteFlag = await window.showWarningMessage(localize("apiAlreadyExists", `API "${apiName}" already exists. Import will trigger an 'Override' of exisiting API. Do you want to continue?`), { modal: true }, DialogResponses.yes, DialogResponses.cancel);
                    if (overwriteFlag !== DialogResponses.yes) {
                        throw new UserCancelledError();
                    }
                }

                const openApiImportPayload: ApiManagementModels.ApiCreateOrUpdateParameter = { displayName: apiName, path: apiName, format: '', value: '' };
                openApiImportPayload.protocols = userOptions.document.schemes === undefined ? ["https"] : userOptions.document.schemes;
                openApiImportPayload.format = userOptions.document.importFormat;
                openApiImportPayload.value = JSON.stringify(userOptions.document.sourceDocument);

                const options = { ifMatch: "*" };
                const api = await this.root.client.api.createOrUpdate(this.root.resourceGroupName, this.root.serviceName, apiName, openApiImportPayload, options);
                return ApiTreeItem.create(this, api);
            } catch (error) {
               throw new Error(processError(error, localize("createAPIFailed", `Failed to create the API ${userOptions.apiName}`)));
            }
        } else {
            throw Error("Expected either OpenAPI document or link.");
        }
    }
}
