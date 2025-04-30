/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { treeUtils } from "../utils/treeUtils";
import { ApimService } from "../azure/apim/ApimService";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { McpServerTreeItem } from "./McpServerTreeItem";

export class McpServersTreeItem extends AzExtParentTreeItem {
    public readonly root: IServiceTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IServiceTreeRoot) {
        super(parent);
        this.root = root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementMcpServers';
    public label: string = "MCP Servers (Preview)";
    public contextValue: string = McpServersTreeItem.contextValue;
    private _nextLink: string | undefined;

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
            this.root.serviceName
        );

        const mcpServers = await apimService.listMcpServers();

        return this.createTreeItemsWithErrorHandling(
            mcpServers,
            "invalidApiManagementMcpServer",
            async (server) => new McpServerTreeItem(this, server, this.root),
            (server) => server.name
        );
    }
}
