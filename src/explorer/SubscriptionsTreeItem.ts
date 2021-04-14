/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { topItemCount } from "../constants";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { SubscriptionTreeItem } from "./SubscriptionTreeItem";

export class SubscriptionsTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementSubscriptions';
    public label: string = "Subscriptions";
    public contextValue: string = SubscriptionsTreeItem.contextValue;
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const subscriptionCollection: ApiManagementModels.SubscriptionCollection = this._nextLink === undefined ?
        await this.root.client.subscription.list(this.root.resourceGroupName, this.root.serviceName,  {top: topItemCount}) :
        await this.root.client.subscription.listNext(this._nextLink);

        this._nextLink = subscriptionCollection.nextLink;

        return this.createTreeItemsWithErrorHandling(
            subscriptionCollection,
            "invalidApiManagementSubscription",
            async (subscription: ApiManagementModels.SubscriptionContract) => new SubscriptionTreeItem(this, subscription),
            (subscription: ApiManagementModels.SubscriptionContract) => {
                if (subscription.displayName !== null &&  subscription.displayName !== undefined) {
                    return subscription.displayName;
                } else {
                    return subscription.name;
                }
            }
        );
    }
}
