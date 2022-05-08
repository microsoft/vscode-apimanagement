/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzureParentTreeItem, ICreateChildImplContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationAccessPolicyContract, IAuthorizationAccessPolicyPropertiesContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { AuthorizationAccessPolicyTreeItem } from "./AuthorizationAccessPolicyTreeItem";
import { IAuthorizationTreeRoot } from "./IAuthorizationTreeRoot";

export interface IAuthorizationAccessPolicyTreeItemContext extends ICreateChildImplContext {
    authorizationAccessPolicyName: string;
    authorizationAccessPolicy: IAuthorizationAccessPolicyPropertiesContract;
}

export class AuthorizationAccessPoliciesTreeItem extends AzureParentTreeItem<IAuthorizationTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementAuthorizationAccessPolicies';
    public label: string = "Access Policies";
    public contextValue: string = AuthorizationAccessPoliciesTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.AuthorizationAccessPolicy', 'Access Policy');
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const apimService = new ApimService(this.root.credentials, 
            this.root.environment.resourceManagerEndpointUrl, 
            this.root.subscriptionId, 
            this.root.resourceGroupName, 
            this.root.serviceName);

        const authorizationAccessPolicies: IAuthorizationAccessPolicyContract[] = await apimService.listAuthorizationAccessPolicies(
            this.root.authorizationProviderName,
            this.root.authorizationName);

        return this.createTreeItemsWithErrorHandling(
            authorizationAccessPolicies,
            "invalidApiManagementAuthorizationAccessPolicy",
            async (accessPolicy: IAuthorizationAccessPolicyContract) => new AuthorizationAccessPolicyTreeItem(this, accessPolicy),
            (accessPolicy: IAuthorizationAccessPolicyContract) => {
                return accessPolicy.name;
            });
    }

    public async createChildImpl(context: IAuthorizationAccessPolicyTreeItemContext): Promise<AuthorizationAccessPolicyTreeItem> {
        if (context.authorizationAccessPolicyName
            && context.authorizationAccessPolicy) {
            const authorizationAccessPolicyName = context.authorizationAccessPolicyName;
            context.showCreatingTreeItem(authorizationAccessPolicyName);

            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                const authorizationAccessPolicy = await apimService.createAuthorizationAccessPolicy(
                    this.root.authorizationProviderName, 
                    this.root.authorizationName, 
                    authorizationAccessPolicyName, 
                    context.authorizationAccessPolicy);

                return new AuthorizationAccessPolicyTreeItem(this, authorizationAccessPolicy);

            } catch (error) {
                throw new Error(processError(error, localize("createAuthorizationAccessPolicy", `Failed to access policy '${authorizationAccessPolicyName}' to Authorization '${this.root.authorizationName}'.`)));
            }
        } else {
            throw Error("Expected Access Policy name.");
        }
    }
}