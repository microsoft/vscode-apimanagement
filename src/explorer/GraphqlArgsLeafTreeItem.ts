/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GraphQLArgument } from "graphql";
import { AzureParentTreeItem, AzureTreeItem } from "vscode-azureextensionui";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { IApiTreeRoot } from "./IApiTreeRoot";

// tslint:disable: no-any
export class GraphqlArgsLeafTreeItem extends AzureTreeItem<IApiTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('op');
    }
    public static contextValue: string = 'azureApiManagementGraphqlArgsLeaf';
    public _label: string;
    public contextValue: string = GraphqlArgsLeafTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.graphqlArgsLeaf', 'graphqlArgsLeaf');
    public argPath: string[];

    private arg: GraphQLArgument;

    public get label() : string {
        return this._label;
    }

    constructor(
        parent: AzureParentTreeItem,
        // tslint:disable-next-line: no-any
        arg: GraphQLArgument,
        argPath: string[]) {
        super(parent);
        this.arg = arg;
        this._label = this.arg.name;
        this.argPath = argPath;
        this.argPath.push(arg.name);
    }
}
