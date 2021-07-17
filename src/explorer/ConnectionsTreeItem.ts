/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzureParentTreeItem, ICreateChildImplContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IConnectionContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { ConnectionTreeItem } from "./ConnectionTreeItem";
import { ITokenProviderTreeRoot } from "./ITokenProviderTreeRoot";

export interface IConnectionTreeItemContext extends ICreateChildImplContext {
    connectionName: string;
}

export class ConnectionsTreeItem extends AzureParentTreeItem<ITokenProviderTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementConnections';
    public label: string = "Connections";
    public contextValue: string = ConnectionsTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.Connection', 'Connection');
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

        const gatewayApis: IConnectionContract[] = await apimService.listConnections(this.root.tokenProviderName);

        return this.createTreeItemsWithErrorHandling(
            gatewayApis,
            "invalidApiManagementConnection",
            async (connection: IConnectionContract) => new ConnectionTreeItem(this, connection),
            (connection: IConnectionContract) => {
                return connection.name;
            });
    }

    public async createChildImpl(context: IConnectionTreeItemContext): Promise<ConnectionTreeItem> {
        if (context.connectionName) {
            const connectionName = context.connectionName;
            context.showCreatingTreeItem(connectionName);

            try {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                const connection = await apimService.createConnection(this.root.tokenProviderName, connectionName);
                return new ConnectionTreeItem(this, connection);

            } catch (error) {
                throw new Error(processError(error, localize("createConnection", `Failed to add connection '${connectionName}' to TokenProvider '${this.root.tokenProviderName}'.`)));
            }
        } else {
            throw Error("Expected Connection name.");
        }
    }
}
