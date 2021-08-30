/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GraphQLField } from "graphql";
import { AzureParentTreeItem, AzureTreeItem } from "vscode-azureextensionui";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { IApiTreeRoot } from "./IApiTreeRoot";

// tslint:disable: no-any
export class GraphqlFieldsLeafTreeItem extends AzureTreeItem<IApiTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('leafnode');
    }

    public get label() : string {
        return this._label;
    }
    public static contextValue: string = 'azureApiManagementGraphqlFieldsLeafNode';
    public _label: string;
    public contextValue: string = GraphqlFieldsLeafTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.graphqlFieldsLeafNode', 'graphqlFieldsLeafNode');
    public fieldPath: string[];

    private field: GraphQLField<any, any, {
        // tslint:disable-next-line: no-any
        [key: string]: any;
    }>;

    constructor(
        parent: AzureParentTreeItem,
        // tslint:disable-next-line: no-any
        field: GraphQLField<any, any, {
            // tslint:disable-next-line: no-any
            [key: string]: any;
        }>,
        fieldPath: string[]) {
        super(parent);
        this.field = field;
        this._label = this.field.name;
        this.fieldPath = fieldPath;
        this.fieldPath.push(this.field.name);
    }
}
