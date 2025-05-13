/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { treeUtils } from "../utils/treeUtils";
import { ApimService } from "../azure/apim/ApimService";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { McpServerTreeItem } from "./McpServerTreeItem";
import * as vscode from 'vscode';
import { mcpLearnMoreUrl } from "../constants";

export class LearnMoreMcpTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'azureApiManagementMcpLearnMore';
    public contextValue: string = LearnMoreMcpTreeItem.contextValue;
    public label: string = 'Learn how to add MCP server';
    
    constructor(parent: AzExtParentTreeItem) {
        super(parent);
    }

    public get commandId(): string {
        return `azureApiManagement.openMcpLearnMore`;
    }

    public async openPage(): Promise<void> {
        await vscode.env.openExternal(vscode.Uri.parse(mcpLearnMoreUrl));
    }
}

export class McpServersTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureApiManagementMcpServers';

    public readonly root: IServiceTreeRoot;
    public label: string = "MCPs (Preview)";
    public contextValue: string = McpServersTreeItem.contextValue;
    
    private _nextLink: string | undefined;

    constructor(parent: AzExtParentTreeItem, root: IServiceTreeRoot) {
        super(parent);
        this.root = root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }

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

        if (!mcpServers || mcpServers.length === 0) {
            return [new LearnMoreMcpTreeItem(this)];
        }

        return this.createTreeItemsWithErrorHandling(
            mcpServers,
            "invalidApiManagementMcpServer",
            async (server) => new McpServerTreeItem(this, server, this.root),
            (server) => server.name
        );
    }
}
