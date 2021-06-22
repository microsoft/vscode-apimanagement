/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { buildSchema, GraphQLObjectType, GraphQLSchema } from "graphql";
import requestPromise from "request-promise";
import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { TempSchema } from "../azure/apim/TempSchema";
import { SharedAccessToken } from "../constants";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { GraphqlObjectTypesTreeItem } from "./GraphqlObjectTypesTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";

export class GraphqlOperationsTreeItem extends AzureParentTreeItem<IApiTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementGraphqlList';
    public label: string = "Types\\Queries";
    public contextValue: string = GraphqlOperationsTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.graphqlList', 'graphqlList');
    private _nextLink: string | undefined;

    private graphqlObjectTypeTreeItems: GraphqlObjectTypesTreeItem;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }
        const requestOptions : requestPromise.RequestPromiseOptions = {
            method: "GET",
            headers: {
                Authorization: SharedAccessToken
            }
        };
        const schemasString = await <Thenable<string>>requestPromise(
            `https://${this.root.serviceName}.management.preview.int-azure-api.net/subscriptions/${this.root.subscriptionId}/resourceGroups/${this.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${this.root.serviceName}/apis/${this.root.apiName}/schemas?api-version=2021-04-01-preview`, requestOptions).promise();
        // tslint:disable: no-unsafe-any
        // tslint:disable-next-line: no-unnecessary-local-variable
        const schemas : TempSchema[] = JSON.parse(schemasString).value;

        const valueList: GraphQLSchema[] = [];
        const objectTypes: GraphQLObjectType[] = [];
        for (const schema of schemas) {
            const builtSchema : GraphQLSchema = buildSchema(schema.properties.document.value);
            valueList.push(builtSchema);
            const typeMap = builtSchema.getTypeMap();
            for (const key of Object.keys(typeMap)) {
                const value = typeMap[key];
                if (value instanceof GraphQLObjectType) {
                    objectTypes.push(value);
                }
            }
        }

        this.graphqlObjectTypeTreeItems = new GraphqlObjectTypesTreeItem(this, objectTypes);
        return [this.graphqlObjectTypeTreeItems];

    }
}
