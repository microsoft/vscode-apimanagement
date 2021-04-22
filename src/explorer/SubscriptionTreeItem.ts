/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SubscriptionContract } from "@azure/arm-apimanagement/src/models";
import { ProgressLocation, window } from "vscode";
import { AzureTreeItem, DialogResponses, ISubscriptionContext, UserCancelledError } from "vscode-azureextensionui";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { ISubscriptionTreeRoot } from "./ISubscriptionTreeRoot";
import { SubscriptionsTreeItem } from "./SubscriptionsTreeItem";

export class SubscriptionTreeItem extends AzureTreeItem<ISubscriptionTreeRoot> {
    public static contextValue: string = 'azureApiManagementSubscriptionTreeItem';
    public contextValue: string = SubscriptionTreeItem.contextValue;

    private _label: string;
    private _root: ISubscriptionTreeRoot;

    constructor(
        parent: SubscriptionsTreeItem,
        public readonly subscriptionContract: SubscriptionContract) {
        super(parent);
        if (this.subscriptionContract.displayName === null || this.subscriptionContract.displayName === undefined) {
            this._label = nonNullProp(this.subscriptionContract, 'name');
        } else {
            this._label = nonNullProp(this.subscriptionContract, 'displayName');
        }
        // tslint:disable-next-line: no-unsafe-any
        this._root = this.createRoot(parent.root);
    }

    public get label() : string {
        return this._label;
    }

    public get root(): ISubscriptionTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('gateway');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async deleteTreeItemImpl() : Promise<void> {
        const message: string = localize("confirmDeleteSubscription", `Are you sure you want to delete subscription '${this.root.subscriptionSid}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("", `Deleting subscription "${this.root.subscriptionSid}"...`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                await this.root.client.subscription.deleteMethod(this.root.resourceGroupName, this.root.serviceName, this.root.subscriptionSid, '*');
            });
            // don't wait
            window.showInformationMessage(localize("deletedSubscription", `Successfully deleted Subscription "${this.root.subscriptionSid}".`));

        } else {
            throw new UserCancelledError();
        }
    }

    private createRoot(subRoot: ISubscriptionContext): ISubscriptionTreeRoot {
        return Object.assign({}, <ISubscriptionTreeRoot>subRoot, {
            // tslint:disable-next-line: no-non-null-assertion
            subscriptionSid: this.subscriptionContract.name!
        });
    }
}
