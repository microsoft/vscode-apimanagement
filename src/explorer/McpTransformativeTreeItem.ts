/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { treeUtils } from "../utils/treeUtils";
import { IMcpServerApiContract } from "../azure/apim/contracts";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { McpServerTreeItem } from "./McpServerTreeItem";

export class McpTransformativeTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureApiManagementMcpTransformative';
    public contextValue: string = McpTransformativeTreeItem.contextValue;
    public readonly label: string = "Transformative";

    constructor(
        parent: AzExtParentTreeItem,
        private readonly mcpServers: IMcpServerApiContract[],
        private readonly root: IServiceTreeRoot) {
        super(parent);
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(): Promise<AzExtTreeItem[]> {
        // Filter MCP servers that have mcpTools with at least one tool
        const transformativeServers = this.mcpServers.filter(server => 
            server.properties.mcpTools && server.properties.mcpTools.length > 0
        );

        return this.createTreeItemsWithErrorHandling(
            transformativeServers,
            "invalidApiManagementMcpServer",
            async (server) => new McpServerTreeItem(this, server, this.root),
            (server) => server.name
        );
    }
}
