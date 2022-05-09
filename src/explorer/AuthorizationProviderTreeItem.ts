/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, ISubscriptionContext, UserCancelledError } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationProviderContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { AuthorizationsTreeItem } from "./AuthorizationsTreeItem";
import { IAuthorizationProviderTreeRoot } from "./IAuthorizationProviderTreeRoot";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class AuthorizationProviderTreeItem extends AzureParentTreeItem<IAuthorizationProviderTreeRoot> {
    public static contextValue: string = 'azureApiManagementAuthorizationProvider';
    public contextValue: string = AuthorizationProviderTreeItem.contextValue;
    public readonly authorizationsTreeItem: AuthorizationsTreeItem;

    private _label: string;
    private _root: IAuthorizationProviderTreeRoot;

    constructor(
        parent: AzureParentTreeItem,
        public readonly authorizationProviderContract: IAuthorizationProviderContract) {
        super(parent);
        this._label = nonNullProp(this.authorizationProviderContract, 'name');
        this._root = this.createRoot(parent.root);

        this.authorizationsTreeItem = new AuthorizationsTreeItem(this);
    }

    public get label() : string {
        return this._label;
    }

    public get root(): IAuthorizationProviderTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('gateway');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IAuthorizationProviderTreeRoot>[]> {
        return [this.authorizationsTreeItem];
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmDeleteAuthorizationProvider", `Are you sure you want to remove Authorization Provider '${this.authorizationProviderContract.name}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("removingAuthorizationProvider", `Removing Authorization Provider "${this.authorizationProviderContract.name}".'`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                await apimService.deleteAuthorizationProvider(this.root.authorizationProviderName);
            });
            // don't wait
            window.showInformationMessage(localize("removedAuthorizationProvider", `Successfully removed Authorization Provider "${this.authorizationProviderContract.name}".`));

        } else {
            throw new UserCancelledError();
        }
    }

    private createRoot(subRoot: ISubscriptionContext): IAuthorizationProviderTreeRoot {
        return Object.assign({}, <IServiceTreeRoot>subRoot, {
            authorizationProviderName: nonNullProp(this.authorizationProviderContract, 'name')
        });
    }
}
