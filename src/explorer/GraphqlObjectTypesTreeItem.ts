/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GraphQLObjectType } from "graphql";
import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { GraphqlObjectTypeTreeItem } from "./GraphqlObjectTypeTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";

export class GraphqlObjectTypesTreeItem extends AzureParentTreeItem<IApiTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementGraphqlObjectTypes';
    public label: string = "Object Types";
    public contextValue: string = GraphqlObjectTypesTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.graphqlObjectTypeList', 'graphqlObjectTypeList');
    private graphqlObjectTypes :  GraphQLObjectType[];

    constructor(
        parent: AzureParentTreeItem,
        public types: GraphQLObjectType[]) {
        super(parent);
        this.graphqlObjectTypes = types;
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean): Promise<AzExtTreeItem[]> {
        return this.createTreeItemsWithErrorHandling(
            this.graphqlObjectTypes,
            "invalidApiManagementGraphqlObjectTypes",
            async (objectType: GraphQLObjectType) => new GraphqlObjectTypeTreeItem(this, objectType),
            (objectType: GraphQLObjectType) => {
                return objectType.name;
            });

    }
}
