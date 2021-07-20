/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { AzExtTreeItem, AzureParentTreeItem, ICreateChildImplContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { ITokenProviderContract } from "../azure/apim/contracts";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { TokenProviderTreeItem } from "./TokenProviderTreeItem";

export interface ITokenProviderTreeItemContext extends ICreateChildImplContext {
    tokenProviderName: string;
    identityProvider: string;
    clientId: string;
    clientSecret: string;
    scopes: string;
}

export class TokenProvidersTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementTokenProviders';
    public label: string = "TokenServices";
    public contextValue: string = TokenProvidersTreeItem.contextValue;
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

        const tokenProviders: ITokenProviderContract[] = await apimService.listTokenProviders();

        return this.createTreeItemsWithErrorHandling(
            tokenProviders,
            "invalidApiManagementTokenProvider",
            async (tokenProvider: ITokenProviderContract) => new TokenProviderTreeItem(this, tokenProvider),
            (tokenProvider: ITokenProviderContract) => {
                return tokenProvider.name;
            });
    }

    public async createChildImpl(context: ITokenProviderTreeItemContext): Promise<TokenProviderTreeItem> {
        if (context.tokenProviderName 
            && context.identityProvider
            && context.clientId
            && context.clientSecret) {

            const tokenProviderName = context.tokenProviderName;
            context.showCreatingTreeItem(tokenProviderName);
            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                const tokenProvider = await apimService.createTokenProvider(context.tokenProviderName, context.identityProvider, context.clientId, context.clientSecret, context.scopes);
                const message = `Successfully created Token service "${tokenProvider.name}". 
                Please add redirect uri '${tokenProvider.properties.OAuthSettings.RedirectUrl}' to the OAuth application before authorizing connection's.`;

                ext.outputChannel.show();
                ext.outputChannel.appendLine(message);
                
                window.showInformationMessage(localize("createdTokenService", message));

                return new TokenProviderTreeItem(this, tokenProvider);

            } catch (error) {
                throw new Error(processError(error, localize("createTokenProvider", `Failed to create token provider '${tokenProviderName}'.`)));
            }
        } else {
            throw Error("Expected Token Provder information.");
        }
    }
 }
