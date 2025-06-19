/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { BackendContract } from '@azure/arm-apimanagement';
import { McpServersTreeItem } from '../explorer/McpServersTreeItem';
import { ApimService } from '../azure/apim/ApimService';
import { localize } from '../localize';

export async function passthroughMcpServer(context: IActionContext, node?: McpServersTreeItem): Promise<void> {
    try {
        if (!node) {
            return;
        }

        // Step 1: Ask user for MCP server name and display name
        const mcpServerName = (await context.ui.showInputBox({
            prompt: localize('enterMcpServerName', 'Enter the name for the MCP server'),
            validateInput: (value: string): string | undefined => {
                if (!value || value.trim().length === 0) {
                    return localize('nameRequired', 'Name is required');
                }
                return undefined;
            }
        })).trim();

        const displayName = (await context.ui.showInputBox({
            prompt: localize('enterMcpServerDisplayName', 'Enter the display name for the MCP server'),
            value: mcpServerName, // Default to the name
            validateInput: (value: string): string | undefined => {
                if (!value || value.trim().length === 0) {
                    return localize('displayNameRequired', 'Display name is required');
                }
                return undefined;
            }
        })).trim();

        // Step 2: Ask user for MCP server URL
        const mcpServerUrl = (await context.ui.showInputBox({
            prompt: localize('enterMcpServerUrl', 'Enter the URL of the MCP server'),
            validateInput: (value: string): string | undefined => {
                if (!value || value.trim().length === 0) {
                    return localize('urlRequired', 'URL is required');
                }
                if (!value.trim().match(/^https?:\/\/.+/)) {
                    return localize('invalidUrl', 'Please enter a valid URL starting with http:// or https://');
                }
                return undefined;
            }
        })).trim();

        // Step 3: Ask user for SSE endpoint (relative URL)
        const sseEndpoint = (await context.ui.showInputBox({
            prompt: localize('enterSseEndpoint', 'Enter the SSE endpoint path (relative to the MCP server URL)'),
            value: '/sse', // Default value
            validateInput: (value: string): string | undefined => {
                if (!value || value.trim().length === 0) {
                    return localize('sseEndpointRequired', 'SSE endpoint is required');
                }
                return undefined;
            }
        })).trim();

        // Step 4: Ask user for Messages endpoint (relative URL)
        const messagesEndpoint = (await context.ui.showInputBox({
            prompt: localize('enterMessagesEndpoint', 'Enter the Messages endpoint path (relative to the MCP server URL)'),
            value: '/messages', // Default value
            validateInput: (value: string): string | undefined => {
                if (!value || value.trim().length === 0) {
                    return localize('messagesEndpointRequired', 'Messages endpoint is required');
                }
                return undefined;
            }
        })).trim();

        // Step 5: Create backend for the MCP server
        const backendName = `${mcpServerName}-backend`;
        
        const backendContract: BackendContract = {
            url: mcpServerUrl,
            protocol: "http"
        };

        // Create backend using Azure Management SDK with progress
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('creatingBackend', 'Creating APIM backend for MCP...'),
            cancellable: false
        }, async (_progress) => {
            await node.root.client.backend.createOrUpdate(
                node.root.resourceGroupName,
                node.root.serviceName,
                backendName,
                backendContract
            );
        });

        // Step 6: Create MCP server
        const mcpServerPayload = {
            properties: {
                displayName: displayName,
                protocols: ["http", "https"],
                description: "This API is used to passthrough existing MCP server.",
                subscriptionRequired: false,
                path: mcpServerName,
                type: "mcp",
                backendId: backendName,
                mcpProperties: {
                    transportType: "sse",
                    endpoints: {
                        sse: {
                            method: "GET",
                            uriTemplate: sseEndpoint
                        },
                        messages: {
                            method: "POST",
                            uriTemplate: messagesEndpoint
                        }
                    }
                }
            }
        };

        // Step 6: Create MCP server using ApimService
        const apimService = new ApimService(
            node.root.credentials,
            node.root.environment.resourceManagerEndpointUrl,
            node.root.subscriptionId,
            node.root.resourceGroupName,
            node.root.serviceName
        );

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('creatingMcpServer', 'Creating MCP server...'),
            cancellable: false
        }, async (_progress) => {
            await apimService.createMcpServer(mcpServerName.trim(), mcpServerPayload);
        });

        // Refresh the tree view to show the new MCP server
        await node.refresh(context);

        vscode.window.showInformationMessage(
            localize('mcpServerPassthroughCreated', `Successfully created passthrough MCP server "${displayName}".`)
        );

    } catch (error) {
        if (error.message && error.message.includes('UserCancelledError')) {
            return;
        }
        vscode.window.showErrorMessage(`Failed to create passthrough MCP server: ${error.message}`);
        throw error;
    }
}
