/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GraphQLField, GraphQLObjectType } from "graphql";
import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { GraphqlFieldsLeafTreeItem } from "./GraphqlFieldsLeafTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";

// tslint:disable: no-any
export class GraphqlFieldsTreeItem extends AzureParentTreeItem<IApiTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }

    public get label() : string {
        return this._label;
    }
    public static contextValue: string = 'azureApiManagementGraphqlFieldsList';
    public _label: string;
    public contextValue: string = GraphqlFieldsTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.graphqlFieldsList', 'graphqlFieldsList');
    public fieldPath: string[];
    private _nextLink: string | undefined;

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

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }
        const fieldChildren = this.field.type;
        if (fieldChildren instanceof GraphQLObjectType) {
            const fields = Object.values(fieldChildren.getFields());
            return await this.createTreeItemsWithErrorHandling(
                fields,
                "invalidApiManagementGraphqlObjectTypes",
                async (objectType: GraphQLField<any, any, {
                    [key: string]: any;
                }>) => {
                    if (objectType.type instanceof GraphQLObjectType) {
                        return new GraphqlFieldsTreeItem(this, objectType, this.fieldPath);
                    } else {
                        return new GraphqlFieldsLeafTreeItem(this, objectType, this.fieldPath);
                    }
                },
                (objectType: GraphQLField<any, any, {
                    [key: string]: any;
                }>) => {
                    return objectType.name;
                });
        }
        return [];
    }
}
