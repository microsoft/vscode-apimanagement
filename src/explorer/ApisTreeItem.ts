/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "azure-arm-apimanagement";
import { ApiContract, ApiCreateOrUpdateParameter } from "azure-arm-apimanagement/lib/models";
import { window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, createTreeItemsWithErrorHandling, DialogResponses, IParsedError, parseError, UserCancelledError } from "vscode-azureextensionui";
import { topItemCount } from "../constants";
import { localize } from "../localize";
import { IOpenApiImportObject } from "../openApi/OpenApiImportObject";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { ApiTreeItem } from "./ApiTreeItem";
import { ApiVersionSetTreeItem } from "./ApiVersionSetTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class ApisTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementApis';
    public label: string = "APIs";
    public contextValue: string = ApisTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.Api', 'API');
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
                    return new ApiTreeItem(this, api);
                }
            },
            (api: ApiManagementModels.ApiContract) => {
                return api.name;
            });
    }

    public async createChildImpl(showCreatingTreeItem: (label: string) => void, userOptions?: { apiName: string, document?: IOpenApiImportObject, apiContract?: ApiContract }): Promise<ApiTreeItem> {
        if (userOptions) {
            if (userOptions.document) {
                return await this.createApiFromOpenApi(showCreatingTreeItem, userOptions.apiName, userOptions.document);
            } else if (userOptions.apiContract) {
                return await this.createApiWithApiContract(showCreatingTreeItem, userOptions.apiName, userOptions.apiContract);
            }
        }
        throw Error("Missing one or more userOptions when creating new Api");
    }

    private async createApiFromOpenApi(showCreatingTreeItem: (label: string) => void, apiName: string, document?: IOpenApiImportObject): Promise<ApiTreeItem> {
        if (document && apiName) {
            showCreatingTreeItem(apiName);
            try {
                document.info.title = apiName;

                await this.checkApiExist(apiName);

                const openApiImportPayload: ApiManagementModels.ApiCreateOrUpdateParameter = { displayName: apiName, path: apiName, format: '', value: '' };
                openApiImportPayload.protocols = document.schemes === undefined ? ["https"] : document.schemes;
                openApiImportPayload.format = document.importFormat;
                openApiImportPayload.value = JSON.stringify(document.sourceDocument);

                const options = { ifMatch: "*" };
                const api = await this.root.client.api.createOrUpdate(this.root.resourceGroupName, this.root.serviceName, apiName, openApiImportPayload, options);
                return new ApiTreeItem(this, api);
            } catch (error) {
                throw new Error(processError(error, localize("createAPIFailed", `Failed to create the API ${apiName}`)));
            }
        } else {
            throw Error("Expected either OpenAPI document or link.");
        }
    }

    private async createApiWithApiContract(showCreatingTreeItem: (label: string) => void, apiName: string, apiContract?: ApiContract): Promise<ApiTreeItem> {
        if (apiContract && apiName) {
            showCreatingTreeItem(apiName);
            try {
                await this.checkApiExist(apiName);
                const apiPayload: ApiCreateOrUpdateParameter = { displayName: apiName, path: apiName, description: apiContract.description, protocols: apiContract.protocols };
                const api = await this.root.client.api.createOrUpdate(this.root.resourceGroupName, this.root.serviceName, apiName, apiPayload);
                return new ApiTreeItem(this, api);
            } catch (error) {
                throw new Error(processError(error, localize("createAPIFailed", `Failed to create the API ${apiName}`)));
            }
        } else {
            throw Error("Something went wrong when creating this new api.");
        }
    }

    private async checkApiExist(apiName: string): Promise<void> {
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
    }
}
