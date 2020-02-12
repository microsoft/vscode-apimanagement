/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureParentTreeItem, AzureTreeItem, createTreeItemsWithErrorHandling } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IGatewayContract } from "../azure/apim/contracts";
import { treeUtils } from "../utils/treeUtils";
import { GatewayTreeItem } from "./GatewayTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class GatewaysTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementGateways';
    public label: string = "Gateways";
    public contextValue: string = GatewaysTreeItem.contextValue;
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzureTreeItem<IServiceTreeRoot>[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);

        const gateways: IGatewayContract[] = await apimService.listGateways();

        return createTreeItemsWithErrorHandling(
            this,
            gateways,
            "invalidApiManagementGateway",
            async (gateway: IGatewayContract) => new GatewayTreeItem(this, gateway),
            (gateway: IGatewayContract) => {
                return gateway.name;
            });
    }
 }
