/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, ISubscriptionContext, UserCancelledError } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { nonNullProp, nonNullValue } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { AuthorizationAccessPoliciesTreeItem } from "./AuthorizationAccessPoliciesTreeItem";
import { AuthorizationAccessPolicyTreeItem } from "./AuthorizationAccessPolicyTreeItem";
import { IAuthorizationProviderTreeRoot } from "./IAuthorizationProviderTreeRoot";
import { IAuthorizationTreeRoot } from "./IAuthorizationTreeRoot";

export class AuthorizationTreeItem extends AzureParentTreeItem<IAuthorizationTreeRoot> {
    public static contextValue: string = 'azureApiManagementAuthorization';
    public readonly authorizationAccessPoliciesTreeItem: AuthorizationAccessPoliciesTreeItem;
    public contextValue: string = AuthorizationTreeItem.contextValue;
    private _label: string;
    private _root: IAuthorizationTreeRoot;
    private apimService: ApimService;

    constructor(
        parent: AzureParentTreeItem,
        public authorizationContract: IAuthorizationContract) {
        super(parent);
        this._label = nonNullProp(authorizationContract, 'name');

        this._root = this.createRoot(parent.root);

        this.authorizationAccessPoliciesTreeItem = new AuthorizationAccessPoliciesTreeItem(this);
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

    public async refreshImpl(): Promise<void> {
        const authorization = await this.getApimService().getAuthorization(this.root.authorizationProviderName, this.authorizationContract.name);
        this.authorizationContract = nonNullValue(authorization);
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IAuthorizationTreeRoot>[]> {
        return [this.authorizationAccessPoliciesTreeItem];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public pickTreeItemImpl(expectedContextValues: (string | RegExp)[]): AzureTreeItem<IAuthorizationTreeRoot> | undefined {
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
        const message: string = localize("confirmAuthorizationRemove", `Are you sure you want to remove Authorization '${this.authorizationContract.name}' from Authorization provider '${this.root.authorizationProviderName}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("removingAuthorization", `Removing Authorization "${this.authorizationContract.name}" from Authorization provider '${this.root.authorizationProviderName}.'`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                await this.getApimService().deleteAuthorization(this.root.authorizationProviderName, nonNullProp(this.authorizationContract, "name"));
            });
            // don't wait
            window.showInformationMessage(localize("removedAuthorization", `Successfully removed authorization "${this.authorizationContract.name}" from Authorization provider '${this.root.authorizationProviderName}'.`));

        } else {
            throw new UserCancelledError();
        }
    }

    private createRoot(subRoot: ISubscriptionContext): IAuthorizationTreeRoot {
        return Object.assign({}, <IAuthorizationProviderTreeRoot>subRoot, {
            authorizationName: nonNullProp(this.authorizationContract, 'name')
        });
    }

    private getApimService(): ApimService {
        if (this.apimService === undefined) {
            this.apimService = new ApimService(
                this.root.credentials,
                this.root.environment.resourceManagerEndpointUrl,
                this.root.subscriptionId,
                this.root.resourceGroupName,
                this.root.serviceName);
        }
        return this.apimService;
    }
}
