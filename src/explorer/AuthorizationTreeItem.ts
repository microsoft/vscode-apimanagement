/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, DialogResponses, ISubscriptionContext, UserCancelledError } from "@microsoft/vscode-azext-utils";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { AuthorizationAccessPoliciesTreeItem } from "./AuthorizationAccessPoliciesTreeItem";
import { AuthorizationAccessPolicyTreeItem } from "./AuthorizationAccessPolicyTreeItem";
import { IAuthorizationProviderTreeRoot } from "./IAuthorizationProviderTreeRoot";
import { IAuthorizationTreeRoot } from "./IAuthorizationTreeRoot";

export class AuthorizationTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureApiManagementAuthorization';
    public readonly authorizationAccessPoliciesTreeItem: AuthorizationAccessPoliciesTreeItem;
    public contextValue: string = AuthorizationTreeItem.contextValue;
    private _label: string;
    private _root: IAuthorizationTreeRoot;

    constructor(
        parent: AzExtParentTreeItem,
        public authorizationContract: IAuthorizationContract,
        root: IAuthorizationProviderTreeRoot) {
        super(parent);
        this._label = nonNullProp(authorizationContract, 'name');

        this._root = this.createRoot(root);

        this.authorizationAccessPoliciesTreeItem = new AuthorizationAccessPoliciesTreeItem(this, this._root);
    }

    public get label(): string {
        return this._label;
    }

    public get description(): string | undefined {
        return this.authorizationContract.properties.status;
    }

    public get root(): IAuthorizationTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('authorization');
    }

    public async loadMoreChildrenImpl(): Promise<AzExtTreeItem[]> {
        return [this.authorizationAccessPoliciesTreeItem];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public pickTreeItemImpl(expectedContextValues: (string | RegExp)[]): AzExtTreeItem | undefined {
        for (const expectedContextValue of expectedContextValues) {
            switch (expectedContextValue) {
                case AuthorizationAccessPolicyTreeItem.contextValue:
                    return this.authorizationAccessPoliciesTreeItem;
                default:
            }
        }
        return undefined;
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmAuthorizationRemove", `Are you sure you want to remove Credential '${this.authorizationContract.name}' from Credential Manager '${this.root.authorizationProviderName}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("removingAuthorization", `Removing Credential "${this.authorizationContract.name}" from Credential Manager '${this.root.authorizationProviderName}.'`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                const apimService = new ApimService(
                    this.root.credentials,
                    this.root.environment.resourceManagerEndpointUrl,
                    this.root.subscriptionId,
                    this.root.resourceGroupName,
                    this.root.serviceName);
                await apimService.deleteAuthorization(this.root.authorizationProviderName, nonNullProp(this.authorizationContract, "name"));
            });
            // don't wait
            window.showInformationMessage(localize("removedAuthorization", `Successfully removed credential "${this.authorizationContract.name}" from Credential Manager '${this.root.authorizationProviderName}'.`));

        } else {
            throw new UserCancelledError();
        }
    }

    private createRoot(subRoot: ISubscriptionContext): IAuthorizationTreeRoot {
        return Object.assign({}, <IAuthorizationProviderTreeRoot>subRoot, {
            authorizationName: nonNullProp(this.authorizationContract, 'name')
        });
    }
}
