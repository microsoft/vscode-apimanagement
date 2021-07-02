/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GraphQLInputField } from "graphql";
import { AzureParentTreeItem, AzureTreeItem } from "vscode-azureextensionui";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { IApiTreeRoot } from "./IApiTreeRoot";

// tslint:disable: no-any
export class GraphqlArgFieldTreeItem extends AzureTreeItem<IApiTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('op');
    }
    public static contextValue: string = 'azureApiManagementGraphqlArgFieldList';
    public _label: string;
    public contextValue: string = GraphqlArgFieldTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.graphqlArgFieldList', 'graphqlArgFieldList');

    private argField: GraphQLInputField;

    public get label() : string {
        return this._label;
    }

    constructor(
        parent: AzureParentTreeItem,
        // tslint:disable-next-line: no-any
        argField: GraphQLInputField) {
        super(parent);
        this.argField = argField;
        this._label = this.argField.name;
    }
}
