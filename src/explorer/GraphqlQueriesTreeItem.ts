/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GraphQLField } from "graphql";
import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { GraphqlObjectTypeTreeItem } from "./GraphqlObjectTypeTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";

// tslint:disable: no-any
export class GraphqlQueriesTreeItem extends AzureParentTreeItem<IApiTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('querylist');
    }
    public static contextValue: string = 'azureApiManagementGraphqlList';
    public label: string = "Query";
    public contextValue: string = GraphqlQueriesTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.graphqlList', 'graphqlList');
    private _nextLink: string | undefined;

    private queryTypes: GraphQLField<any, any, {
        [key: string]: any;
    }>[];

    constructor(
        parent: AzureParentTreeItem,
        queryTypes: GraphQLField<any, any, {
            [key: string]: any;
        }>[]) {
        super(parent);
        this.queryTypes = queryTypes;
    }

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        return this.createTreeItemsWithErrorHandling(
            this.queryTypes,
            "invalidApiManagementGraphqlObjectTypes",
            async (objectType: GraphQLField<any, any, {
                [key: string]: any;
            }>) => new GraphqlObjectTypeTreeItem(this, objectType),
            (objectType: GraphQLField<any, any, {
                [key: string]: any;
            }>) => {
                return objectType.name;
            });
    }
}
