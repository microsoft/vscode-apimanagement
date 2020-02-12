/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureParentTreeItem, AzureTreeItem, createTreeItemsWithErrorHandling } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IGatewayApiContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { GatewayApiTreeItem } from "./GatewayApiTreeItem";
import { IGatewayTreeRoot } from "./IGatewayTreeRoot";

export class GatewayApisTreeItem extends AzureParentTreeItem<IGatewayTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementGatewayApis';
    public label: string = "Apis";
    public contextValue: string = GatewayApisTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.GatewayApi', 'Gateway API');
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzureTreeItem<IGatewayTreeRoot>[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);

        const gatewayApis: IGatewayApiContract[] = await apimService.listGatewayApis(this.root.gatewayName);

        return createTreeItemsWithErrorHandling(
            this,
            gatewayApis,
            "invalidApiManagementGatewayApi",
            async (api: IGatewayApiContract) => new GatewayApiTreeItem(this, api),
            (api: IGatewayApiContract) => {
                return api.name;
            });
    }

    public async createChildImpl(showCreatingTreeItem: (label: string) => void, userOptions?: { apiName: string }): Promise<GatewayApiTreeItem> {
        if (userOptions && userOptions.apiName) {
            const apiName = userOptions.apiName;
            showCreatingTreeItem(apiName);

            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                const api = await apimService.createGatewayApi(this.root.gatewayName, apiName);
                return new GatewayApiTreeItem(this, api);

            } catch (error) {
                throw new Error(processError(error, localize("addApiToProductFailed", `Failed to add '${apiName}' to gateway '${this.root.gatewayName}'.`)));
            }
        } else {
            throw Error("Expected API name.");
        }
    }
}
