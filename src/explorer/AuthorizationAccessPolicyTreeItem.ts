/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, DialogResponses, ISubscriptionContext, UserCancelledError } from "@microsoft/vscode-azext-utils";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationAccessPolicyContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IAuthorizationAccessPolicyTreeRoot } from "./IAuthorizationAccessPolicyTreeRoot";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class AuthorizationAccessPolicyTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'azureApiManagementAuthorizationAccessPolicy';
    public contextValue: string = AuthorizationAccessPolicyTreeItem.contextValue;

    private _label: string;
    private _root: IAuthorizationAccessPolicyTreeRoot;

    constructor(
        parent: AzExtParentTreeItem,
        public readonly authorizationAccessPolicyContract: IAuthorizationAccessPolicyContract,
        root: IServiceTreeRoot) {
        super(parent);

        this._root = this.createRoot(root);

        this._label = nonNullProp(authorizationAccessPolicyContract, 'name');
    }

    public get label() : string {
        return this._label;
    }

    public get root(): IAuthorizationAccessPolicyTreeRoot {
        return this._root;
    }

    public get description(): string | undefined {
        return this.authorizationAccessPolicyContract.properties.objectId;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('accesspolicy');
    }

    public get commandId(): string {
        return 'azureApiManagement.showArmAuthorizationAccessPolicy';
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmAccessPolicyRemove", `Are you sure you want to remove Access Policy '${this.authorizationAccessPolicyContract.name}' from Credential '${this.root.authorizationName}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("removingAuthorizationAccessPolicy", `Removing Access Policy "${this.authorizationAccessPolicyContract.name}" from Credential '${this.root.authorizationName}'.'`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                await apimService.deleteAuthorizationAccessPolicy(
this.root.authorizationProviderName,
this.root.authorizationName,
                    nonNullProp(this.authorizationAccessPolicyContract, "name"));
            });
            // don't wait
            window.showInformationMessage(localize("removedAuthorizationAccessPolicy", `Successfully removed Access Policy "${this.authorizationAccessPolicyContract.name}" from Credential '${this.root.authorizationName}'.`));

        } else {
            throw new UserCancelledError();
        }
    }

    private createRoot(subRoot: ISubscriptionContext): IAuthorizationAccessPolicyTreeRoot {
        return Object.assign({}, <IAuthorizationAccessPolicyTreeRoot>subRoot, {
            accessPolicyName: nonNullProp(this.authorizationAccessPolicyContract, 'name')
        });
    }
}
