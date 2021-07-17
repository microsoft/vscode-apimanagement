/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { ITokenProviderContract } from "../azure/apim/contracts";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { TokenProviderTreeItem } from "./TokenProviderTreeItem";

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
 }
