/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { ApiContract, ApiCreateOrUpdateParameter } from "@azure/arm-apimanagement/src/models";
import { ServiceClient } from "@azure/ms-rest-js";
import { AzExtTreeItem, AzureParentTreeItem, createGenericClient, ICreateChildImplContext } from "vscode-azureextensionui";
import { IApiContract } from "../azure/apim/TempApiContract";
import { topItemCount } from "../constants";
import { localize } from "../localize";
import { IOpenApiImportObject } from "../openApi/OpenApiImportObject";
import { apiUtil } from "../utils/apiUtil";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { ApiTreeItem } from "./ApiTreeItem";
import { ApiVersionSetTreeItem } from "./ApiVersionSetTreeItem";
import { GraphqlApiTreeItem } from "./GraphqlApiTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export interface IApiTreeItemContext extends ICreateChildImplContext {
    apiName: string;
    document?: IOpenApiImportObject;
    apiContract?: ApiContract;
}

export class ApisTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementApis';
    public label: string = "APIs";
    public contextValue: string = ApisTreeItem.contextValue;
    public selectedApis: ApiContract[] = [];
    //public filterValue: string | undefined;
    public readonly childTypeLabel: string = localize('azureApiManagement.Api', 'API');
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        let apisToLoad : ApiContract[] = this.selectedApis;
        let apisToLoad2 : IApiContract[] = [];
        if (this.selectedApis.length === 0) {
            const apiCollection1: ApiManagementModels.ApiCollection = this._nextLink === undefined ?
            await this.root.client.api.listByService(this.root.resourceGroupName, this.root.serviceName, { expandApiVersionSet: true, top: topItemCount }) :
            await this.root.client.api.listByServiceNext(this._nextLink);

            this._nextLink = apiCollection1.nextLink;

            apisToLoad = apiCollection1.map((s) => s).filter(s => apiUtil.isNotApiRevision(s));

            const client: ServiceClient = await createGenericClient(this.root.credentials);
            const apiCollectionString = await client.sendRequest({
                method: "GET",
                // tslint:disable-next-line: no-non-null-assertion
                url: `${this.root.environment.resourceManagerEndpointUrl}/subscriptions/${this.root.subscriptionId}/resourceGroups/${this.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${this.root.serviceName}/apis?api-version=2021-04-01-preview`
            });
            // tslint:disable-next-line: no-unsafe-any
            const apiCollectionTemp : IApiContract[] = apiCollectionString.parsedBody.value;
            apisToLoad2 = this.findGraphqlApis(apiCollectionTemp);
        }

        const versionSetMap: Map<string, ApiVersionSetTreeItem> = new Map<string, ApiVersionSetTreeItem>();
        // tslint:disable-next-line: no-unnecessary-local-variable
        const children1 = await this.createTreeItemsWithErrorHandling(
            apisToLoad,
            "invalidApiManagementApi",
            async (api: ApiManagementModels.ApiContract) => {
                if (api.apiVersionSetId) {
                    let apiVersionSetTreeItem = versionSetMap.get(api.apiVersionSetId);
                    if (!apiVersionSetTreeItem) {
                        apiVersionSetTreeItem = new ApiVersionSetTreeItem(this, api);
                        // tslint:disable-next-line: no-non-null-assertion
                        versionSetMap.set(api.apiVersionSetId, apiVersionSetTreeItem!);
                        return apiVersionSetTreeItem;
                    } else {
                        if (apiUtil.isNotApiRevision(api)) {
                            apiVersionSetTreeItem.addApiToSet(api);
                        }
                        return undefined;
                    }
                } else if (apiUtil.isNotApiRevision(api)) {
                    return new ApiTreeItem(this, api);
                }
                return undefined;
            },
            (api: ApiManagementModels.ApiContract) => {
                return api.name;
            });

        const children2 = await this.createTreeItemsWithErrorHandling(
            apisToLoad2,
            "invalidApiManagementApi",
            async (api: IApiContract) => {
                if (api.properties.isCurrent !== undefined && api.properties.isCurrent === true) {
                    return new GraphqlApiTreeItem(this, api);
                }
                return undefined;
            },
            (api: IApiContract) => {
                return api.name;
            }
        );
        return children1.concat(children2);
    }

    public findGraphqlApis(apiCollection : IApiContract[]): IApiContract[] {
        const collection : IApiContract[] = [];
        for (const api of apiCollection) {
            if (api.properties.type === 'graphql') {
                collection.push(api);
            }
        }
        return collection;
    }

    public async createChildImpl(context: IApiTreeItemContext): Promise<ApiTreeItem> {
        if (context.document) {
            return await this.createApiFromOpenApi(context.showCreatingTreeItem, context.apiName, context.document);
        } else if (context.apiContract) {
            return await this.createApiWithApiContract(context.showCreatingTreeItem, context.apiName, context.apiContract);
        }
        throw Error(localize("", "Missing one or more userOptions when creating new Api"));
    }

    private async createApiFromOpenApi(showCreatingTreeItem: (label: string) => void, apiName: string, document?: IOpenApiImportObject): Promise<ApiTreeItem> {
        if (document && apiName) {
            showCreatingTreeItem(apiName);
            try {
                const api = await apiUtil.createOrUpdateApiWithSwaggerObject(this, apiName, document);
                return new ApiTreeItem(this, api);
            } catch (error) {
                throw new Error(processError(error, localize("createAPIFailed", `Failed to create the API ${apiName}`)));
            }
        } else {
            throw Error(localize("", "Expected either OpenAPI document or link."));
        }
    }

    private async createApiWithApiContract(showCreatingTreeItem: (label: string) => void, apiName: string, apiContract?: ApiContract): Promise<ApiTreeItem> {
        if (apiContract && apiName) {
            showCreatingTreeItem(apiName);
            try {
                await apiUtil.checkApiExist(this, apiName);
                const apiPayload: ApiCreateOrUpdateParameter = { displayName: apiName, path: apiName, description: apiContract.description, protocols: apiContract.protocols };
                const api = await this.root.client.api.createOrUpdate(this.root.resourceGroupName, this.root.serviceName, apiName, apiPayload);
                return new ApiTreeItem(this, api);
            } catch (error) {
                throw new Error(processError(error, localize("createAPIFailed", `Failed to create the API ${apiName}`)));
            }
        } else {
            throw Error(localize("", "Something went wrong when creating this new api."));
        }
    }
}
