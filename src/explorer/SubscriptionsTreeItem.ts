/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SubscriptionContract } from "@azure/arm-apimanagement";
import { AzExtTreeItem, AzExtParentTreeItem, ISubscriptionContext } from "@microsoft/vscode-azext-utils";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { SubscriptionTreeItem } from "./SubscriptionTreeItem";

export function createSubscriptionTreeItem(
    parent: AzExtParentTreeItem,
    subscription: ISubscriptionContext,
): AzExtTreeItem {
    return new SubscriptionsTreeItem(parent, subscription);
}

export class SubscriptionsTreeItem extends AzExtParentTreeItem {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementSubscriptions';
    public label: string = "Subscriptions";
    public contextValue: string = SubscriptionsTreeItem.contextValue;
    private _nextLink: string | undefined;
    public readonly root: IServiceTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IServiceTreeRoot) {
        super(parent);
        this.root = root;
    }

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        let subscriptionCollection: SubscriptionContract[];
        subscriptionCollection = await uiUtils.listAllIterator(this.root.client.subscription.list(this.root.resourceGroupName, this.root.serviceName));

        return this.createTreeItemsWithErrorHandling(
            subscriptionCollection,
            "invalidApiManagementSubscription",
            async (subscription: SubscriptionContract) => new SubscriptionTreeItem(this, subscription, this.root),
            (subscription: SubscriptionContract) => {
                if (subscription.displayName !== null && subscription.displayName !== undefined) {
                    return subscription.displayName;
                } else {
                    return subscription.name;
                }
            }
        );
    }
}
