/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, isUserCancelledError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { McpServerTreeItem } from '../explorer/McpServerTreeItem';
import { localize } from '../localize';

export async function copyMcpServerUrl(context: IActionContext, node?: McpServerTreeItem): Promise<void> {
    try {
        if (!node) {
            return;
        }

        // Get APIM service details including hostname configuration
        const apimService = await node.root.client.apiManagementService.get(
            node.root.resourceGroupName,
            node.root.serviceName
        );

        // Check the type of MCP server
        const mcpTools = node.mcpServerContract.properties.mcpTools;
        const isTransformative = mcpTools && mcpTools.length > 0;

        let url: string;
        const baseUrl = `${apimService.gatewayUrl}/${node.mcpServerContract.properties.path}`;

        if (isTransformative) {
            // For transformative MCP servers, use current logic
            const endpointType = await context.ui.showQuickPick(
                [
                    { label: 'SSE' },
                    { label: 'Streamable HTTP' }
                ],
                { placeHolder: 'Select endpoint type' }
            );

            url = endpointType.label === 'SSE' ? `${baseUrl}/sse` : `${baseUrl}/mcp`;
        } else {
            // For passthrough MCP servers, check if it contains SSE endpoint
            const mcpProperties = (node.mcpServerContract.properties as any).mcpProperties;
            
            // Check if transport type is SSE but no SSE endpoint exists
            if (mcpProperties && mcpProperties.transportType === 'sse') {
                if (!mcpProperties.endpoints || !mcpProperties.endpoints.sse) {
                    throw new Error('SSE transport type is configured but no SSE endpoint is defined for this passthrough MCP server.');
                }
                // Use SSE endpoint URL
                const sseEndpoint = mcpProperties.endpoints.sse.uriTemplate;
                url = `${baseUrl}${sseEndpoint}`;
            } else {
                // Use MCP endpoint URL
                url = `${baseUrl}`;
            }            
        }

        // Copy to clipboard
        await vscode.env.clipboard.writeText(url);
        vscode.window.showInformationMessage(localize('mcpServerUrl.copied', `MCP server URL has been copied to clipboard.`));
    } catch (error) {
        if (isUserCancelledError(error)) {
            return;
        }
        vscode.window.showErrorMessage(error.message);
        throw error;
    }
}
