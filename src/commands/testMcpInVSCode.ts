/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { McpServerTreeItem } from '../explorer/McpServerTreeItem';

interface IMcpInput {
    type: string;
    id: string;
    description: string;
    password?: boolean;
}

interface IMcpServerConfig {
    type: string;
    url: string;
    headers?: { [key: string]: string };
}

export async function testMcpInVSCode(_context: IActionContext, node?: McpServerTreeItem): Promise<void> {
    try {
        if (!node) {
            // Not called from context menu
            return;
        }
        
        // Get MCP Server information
        const mcpServerName = node.mcpServerContract.properties.displayName || node.mcpServerContract.name;
        
        // Get APIM service details including hostname configuration
        const apimService = await node.root.client.apiManagementService.get(
            node.root.resourceGroupName,
            node.root.serviceName
        );

        // Initialize server configuration
        const serverConfig: IMcpServerConfig = {
            type: "sse",
            url: `${apimService.gatewayUrl}/${node.mcpServerContract.properties.path}/sse`
        };

        // Get MCP settings with proper types
        const mcpConfig = vscode.workspace.getConfiguration("mcp");
        const currentServers = mcpConfig.get<{ [key: string]: IMcpServerConfig }>("servers") || {};
        const inputs: IMcpInput[] = Array.from(mcpConfig.get<IMcpInput[]>("inputs") || []);
        
        // If subscription is required, add it
        if (node.mcpServerContract.properties.subscriptionRequired) {
            // Get subscription header name
            const subKeyHeader = node.mcpServerContract.properties.subscriptionKeyParameterNames?.header;
            if (subKeyHeader) {
                // Add or update subscription key input
                const newInput: IMcpInput = {
                    type: "promptString",
                    id: `${mcpServerName}-sub-key`,
                    description: "API Management Subscription Key",
                    password: true
                };

                // Find existing input or append new one
                const existingIndex = inputs.findIndex((input) => input.id === newInput.id);
                if (existingIndex >= 0) {
                    inputs[existingIndex] = newInput;
                } else {
                    inputs.push(newInput);
                }
                
                // Update server config with header
                serverConfig.headers = {
                    [subKeyHeader]: `\${input:${mcpServerName}-sub-key}`
                };
            }
        }

        // Update configuration
        await mcpConfig.update("inputs", inputs, vscode.ConfigurationTarget.Global);
        
        const updatedServers: { [key: string]: IMcpServerConfig } = {
            ...currentServers,
            [mcpServerName]: serverConfig
        };
        await mcpConfig.update("servers", updatedServers, vscode.ConfigurationTarget.Global);

        // Show notification
        const message = `Successfully added MCP server "${mcpServerName}" to VS Code settings.`;
        const openCopilot = "Open GitHub Copilot";
        
        const result = await vscode.window.showInformationMessage(message, openCopilot);
        if (result === openCopilot) {
            await vscode.commands.executeCommand("workbench.action.chat.open", {
                query: "",
                mode: "agent"
            });
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to add MCP server to VS Code settings: ${error.message}`);
        throw error;
    }
}
