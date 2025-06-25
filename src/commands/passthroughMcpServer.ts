/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import * as crypto from 'crypto';
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

        // Step 2: Ask user to select transport protocol
        const protocolChoice = await context.ui.showQuickPick([
            { label: 'SSE', description: 'Server-Sent Events' },
            { label: 'Streamable HTTP', description: 'Streamable HTTP protocol' }
        ], {
            placeHolder: localize('selectProtocol', 'Select the transport protocol for the MCP server')
        });

        const transportType = protocolChoice.label === 'SSE' ? 'sse' : 'streamable-http';

        // Step 3: Ask user for MCP server URL
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

        // Step 4: Ask user for APIM API URL suffix
        const apiUrlSuffix = (await context.ui.showInputBox({
            prompt: localize('enterApiUrlSuffix', 'Enter the APIM API URL suffix'),
            value: mcpServerName, // Default to the server name
            validateInput: (value: string): string | undefined => {
                if (!value || value.trim().length === 0) {
                    return localize('apiUrlSuffixRequired', 'API URL suffix is required');
                }
                return undefined;
            }
        })).trim();

        // Step 5: For SSE protocol, ask for SSE and Messages endpoints
        let sseEndpoint = '';
        let messagesEndpoint = '';
        
        if (transportType === 'sse') {
            sseEndpoint = (await context.ui.showInputBox({
                prompt: localize('enterSseEndpoint', 'Enter the SSE endpoint path (relative to the MCP server URL)'),
                value: '/sse', // Default value
                validateInput: (value: string): string | undefined => {
                    if (!value || value.trim().length === 0) {
                        return localize('sseEndpointRequired', 'SSE endpoint is required');
                    }
                    return undefined;
                }
            })).trim();

            messagesEndpoint = (await context.ui.showInputBox({
                prompt: localize('enterMessagesEndpoint', 'Enter the Messages endpoint path (relative to the MCP server URL)'),
                value: '/messages', // Default value
                validateInput: (value: string): string | undefined => {
                    if (!value || value.trim().length === 0) {
                        return localize('messagesEndpointRequired', 'Messages endpoint is required');
                    }
                    return undefined;
                }
            })).trim();
        }

        // Step 6: Create backend for the MCP server with random GUID name
        const backendName = crypto.randomUUID();
        
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

        // Step 7: Create MCP server payload based on transport type
        let mcpServerPayload: any = {
            properties: {
                displayName: displayName,
                protocols: ["http", "https"],
                description: "This API is used to passthrough existing MCP server.",
                subscriptionRequired: false,
                path: apiUrlSuffix,
                type: "mcp",
                backendId: backendName,
                mcpProperties: {
                    transportType: transportType
                }
            }
        };

        // Add endpoints for SSE protocol
        if (transportType === 'sse') {
            mcpServerPayload.properties.mcpProperties.endpoints = {
                sse: {
                    method: "GET",
                    uriTemplate: sseEndpoint
                },
                messages: {
                    method: "POST",
                    uriTemplate: messagesEndpoint
                }
            };
        }

        // Step 8: Create MCP server using ApimService
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
            localize('mcpServerPassthroughCreated', `Successfully proxied MCP server "${displayName}" with ${transportType.toUpperCase()} protocol.`)
        );

    } catch (error) {
        if (error.message && error.message.includes('UserCancelledError')) {
            return;
        }
        vscode.window.showErrorMessage(`Failed to proxy MCP server: ${error.message}`);
        throw error;
    }
}
