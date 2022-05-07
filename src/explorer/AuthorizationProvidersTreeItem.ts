
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { AzExtTreeItem, AzureParentTreeItem, ICreateChildImplContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationProviderContract, IAuthorizationProviderPropertiesContract } from "../azure/apim/contracts";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { AuthorizationProviderTreeItem } from "./AuthorizationProviderTreeItem";

export interface IAuthorizationProviderTreeItemContext extends ICreateChildImplContext {
    name : string;
    authorizationProvider: IAuthorizationProviderPropertiesContract;
}

export class AuthorizationProvidersTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementAuthorizationProviders';
    public label: string = "AuthorizationProviders";
    public contextValue: string = AuthorizationProvidersTreeItem.contextValue;
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

        const tokenProviders: IAuthorizationProviderContract[] = await apimService.listAuthorizationProviders();

        return this.createTreeItemsWithErrorHandling(
            tokenProviders,
            "invalidApiManagementAuthorizationProvider",
            async (authorizationProvider: IAuthorizationProviderContract) => new AuthorizationProviderTreeItem(this, authorizationProvider),
            (authorizationProvider: IAuthorizationProviderContract) => {
                return authorizationProvider.name;
            });
    }

    public async createChildImpl(context: IAuthorizationProviderTreeItemContext): Promise<AuthorizationProviderTreeItem> {
        if (context.name) {
            const authorizationProviderName = context.name;
            context.showCreatingTreeItem(authorizationProviderName);
            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                const authorizationProvider : IAuthorizationProviderContract = await apimService.createAuthorizationProvider(context.name, context.authorizationProvider);
                
                const message = `Make sure to add redirect url '${authorizationProvider.properties.oauth2?.redirectUrl}' to the OAuth application before creating Authorization(s).`;

                ext.outputChannel.show();
                ext.outputChannel.appendLine(message);

                window.showWarningMessage(localize("redirectUrlMessage", message));

                return new AuthorizationProviderTreeItem(this, authorizationProvider);

            } catch (error) {
                throw new Error(processError(error, localize("createAuthorizationProvider", `Failed to create Authorization Provider '${authorizationProviderName}'.`)));
            }
        } else {
            throw Error("Expected Authorization Provder information.");
        }
    }
 }