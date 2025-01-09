/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzExtParentTreeItem, ICreateChildImplContext } from "@microsoft/vscode-azext-utils";
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

export class AuthorizationAccessPoliciesTreeItem extends AzExtParentTreeItem {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementAuthorizationAccessPolicies';
    public label: string = "Access policies";
    public contextValue: string = AuthorizationAccessPoliciesTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.AuthorizationAccessPolicy', 'AuthorizationAccessPolicy');
    private _nextLink: string | undefined;
    public readonly root: IAuthorizationTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IAuthorizationTreeRoot) {
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

        const apimService = new ApimService(
            this.root.credentials,
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
            async (accessPolicy: IAuthorizationAccessPolicyContract) => new AuthorizationAccessPolicyTreeItem(this, accessPolicy, this.root),
            (accessPolicy: IAuthorizationAccessPolicyContract) => {
                return accessPolicy.name;
            });
    }

    public async createChildImpl(context: IAuthorizationAccessPolicyTreeItemContext): Promise<AuthorizationAccessPolicyTreeItem> {
        if (context.authorizationAccessPolicyName
            && context.authorizationAccessPolicy !== undefined) {
            const authorizationAccessPolicyName = context.authorizationAccessPolicyName;
            context.showCreatingTreeItem(authorizationAccessPolicyName);

            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                let authorizationAccessPolicy = await apimService.getAuthorizationAccessPolicy(this.root.authorizationProviderName, this.root.authorizationName, authorizationAccessPolicyName);
                if (authorizationAccessPolicy === undefined) {
                    authorizationAccessPolicy = await apimService.createAuthorizationAccessPolicy(
                        this.root.authorizationProviderName,
                        this.root.authorizationName,
                        authorizationAccessPolicyName,
                        context.authorizationAccessPolicy);
                    return new AuthorizationAccessPolicyTreeItem(this, authorizationAccessPolicy, this.root);
                } else {
                    throw new Error(localize("createAuthorizationAccessPolicy", `Access policy '${authorizationAccessPolicyName}' already exists.`));
                }
            } catch (error) {
                throw new Error(processError(error, localize("createAuthorizationAccessPolicy", `Failed to access policy '${authorizationAccessPolicyName}' to Authorization '${this.root.authorizationName}'.`)));
            }
        } else {
            throw Error("Expected Access Policy name.");
        }
    }
}
