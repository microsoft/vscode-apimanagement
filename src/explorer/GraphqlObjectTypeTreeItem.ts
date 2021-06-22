/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GraphQLObjectType } from "graphql";
import { AzureParentTreeItem, AzureTreeItem } from "vscode-azureextensionui";
import { treeUtils } from "../utils/treeUtils";
import { IOperationTreeRoot } from "./IOperationTreeRoot";

export class GraphqlObjectTypeTreeItem extends AzureParentTreeItem<IOperationTreeRoot> {
    public static contextValue: string = 'azureApiManagementGraphqlObjectType';
    public contextValue: string = GraphqlObjectTypeTreeItem.contextValue;

    private _name: string;
    private _label: string;

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('op');
    }

    public get label() : string {
        return this._label;
    }

    public get id(): string {
        return this._name;
    }

    constructor(
        parent: AzureParentTreeItem,
        public readonly objectType: GraphQLObjectType) {
        super(parent);
        this._label = objectType.name;
        this._name = objectType.name;
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IOperationTreeRoot>[]> {
        return [];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }
}
