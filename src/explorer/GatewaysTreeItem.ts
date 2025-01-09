/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { ApimService } from "../azure/apim/ApimService";
import { IGatewayContract } from "../azure/apim/contracts";
import { treeUtils } from "../utils/treeUtils";
import { GatewayTreeItem } from "./GatewayTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class GatewaysTreeItem extends AzExtParentTreeItem {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementGateways';
    public label: string = "Gateways";
    public contextValue: string = GatewaysTreeItem.contextValue;
    private _nextLink: string | undefined;
    public readonly root: IServiceTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IServiceTreeRoot) {
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

        const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);

        const gateways: IGatewayContract[] = await apimService.listGateways();

        return this.createTreeItemsWithErrorHandling(
            gateways,
            "invalidApiManagementGateway",
            async (gateway: IGatewayContract) => new GatewayTreeItem(this, gateway, this.root),
            (gateway: IGatewayContract) => {
                return gateway.name;
            });
    }
}
