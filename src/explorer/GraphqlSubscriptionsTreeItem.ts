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
export class GraphqlSubscriptionsTreeItem extends AzureParentTreeItem<IApiTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementGraphqlSubscriptionsList';
    public label: string = "Subscription";
    public contextValue: string = GraphqlSubscriptionsTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.graphqlSubscriptionList', 'graphqlSubscriptionList');
    private _nextLink: string | undefined;

    private mutationTypes: GraphQLField<any, any, {
        // tslint:disable-next-line: no-any
        [key: string]: any;
    }>[];

    constructor(
        parent: AzureParentTreeItem,
        // tslint:disable-next-line: no-any
        mutationTypes: GraphQLField<any, any, {
            // tslint:disable-next-line: no-any
            [key: string]: any;
        }>[]) {
        super(parent);
        this.mutationTypes = mutationTypes;
    }

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        return this.createTreeItemsWithErrorHandling(
            this.mutationTypes,
            "invalidApiManagementGraphqlObjectTypes",
            async (objectType: GraphQLField<any, any, {
                // tslint:disable-next-line: no-any
                [key: string]: any;
            }>) => new GraphqlObjectTypeTreeItem(this, objectType),
            (objectType: GraphQLField<any, any, {
                // tslint:disable-next-line: no-any
                [key: string]: any;
            }>) => {
                return objectType.name;
            });

    }
}
