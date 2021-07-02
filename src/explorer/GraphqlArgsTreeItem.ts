/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GraphQLArgument, GraphQLInputField, GraphQLInputFieldMap, GraphQLInputObjectType, GraphQLInputType } from "graphql";
import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { GraphqlArgFieldTreeItem } from "./GraphqlArgFieldTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";

// tslint:disable: no-any
export class GraphqlArgsTreeItem extends AzureParentTreeItem<IApiTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('op');
    }
    public static contextValue: string = 'azureApiManagementGraphqlArgsList';
    public _label: string;
    public contextValue: string = GraphqlArgsTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.graphqlArgsList', 'graphqlArgsList');
    private _nextLink: string | undefined;

    private arg: GraphQLArgument;

    public get label() : string {
        return this._label;
    }

    constructor(
        parent: AzureParentTreeItem,
        // tslint:disable-next-line: no-any
        arg: GraphQLArgument) {
        super(parent);
        this.arg = arg;
        this._label = this.arg.name;
    }

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }
        const args : GraphQLInputType = this.arg.type;
        if (args instanceof GraphQLInputObjectType) {
            const fields : GraphQLInputFieldMap = args.getFields();
            const fieldValues : GraphQLInputField[] = Object.values(fields);
            return await this.createTreeItemsWithErrorHandling(
                fieldValues,
                "invalidApiManagementGraphqlObjectTypes",
                async (objectType: GraphQLInputField) => new GraphqlArgFieldTreeItem(this, objectType),
                (objectType: GraphQLInputField) => {
                    return objectType.name;
                });
        }
        return [];
    }
}
