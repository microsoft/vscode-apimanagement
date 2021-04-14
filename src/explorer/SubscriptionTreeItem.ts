/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SubscriptionContract } from "@azure/arm-apimanagement/src/models";
import { AzureTreeItem, ISubscriptionContext } from "vscode-azureextensionui";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { SubscriptionsTreeItem } from "./SubscriptionsTreeItem";

export class SubscriptionTreeItem extends AzureTreeItem<IServiceTreeRoot> {
    public static contextValue: string = 'azureApiManagementSubscriptionTreeItem';
    public contextValue: string = SubscriptionTreeItem.contextValue;

    private _label: string;
    private _root: IServiceTreeRoot;

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

    public get root(): IServiceTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('gateway');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    private createRoot(subRoot: ISubscriptionContext): IServiceTreeRoot {
        return Object.assign({}, <IServiceTreeRoot>subRoot, {
            subscriptionName: nonNullProp(this.subscriptionContract, 'name')
        });
    }
}
