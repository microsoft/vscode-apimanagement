/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzExtParentTreeItem, ICreateChildImplContext } from "@microsoft/vscode-azext-utils";
import { ApimService } from "../azure/apim/ApimService";
import { IGatewayApiContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { GatewayApiTreeItem } from "./GatewayApiTreeItem";
import { IGatewayTreeRoot } from "./IGatewayTreeRoot";

export interface IGatewayTreeItemContext extends ICreateChildImplContext {
    apiName: string;
}

export class GatewayApisTreeItem extends AzExtParentTreeItem {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementGatewayApis';
    public label: string = "Apis";
    public contextValue: string = GatewayApisTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.GatewayApi', 'Gateway API');
    private _nextLink: string | undefined;
    public readonly root: IGatewayTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IGatewayTreeRoot) {
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

        const gatewayApis: IGatewayApiContract[] = await apimService.listGatewayApis(this.root.gatewayName);

        return this.createTreeItemsWithErrorHandling(
            gatewayApis,
            "invalidApiManagementGatewayApi",
            async (api: IGatewayApiContract) => new GatewayApiTreeItem(this, api, this.root),
            (api: IGatewayApiContract) => {
                return api.name;
            });
    }

    public async createChildImpl(context: IGatewayTreeItemContext): Promise<GatewayApiTreeItem> {
        if (context.apiName) {
            const apiName = context.apiName;
            context.showCreatingTreeItem(apiName);

            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                const api = await apimService.createGatewayApi(this.root.gatewayName, apiName);
                return new GatewayApiTreeItem(this, api, this.root);

            } catch (error) {
                throw new Error(processError(error, localize("addApiToProductFailed", `Failed to add '${apiName}' to gateway '${this.root.gatewayName}'.`)));
            }
        } else {
            throw Error("Expected API name.");
        }
    }
}
