/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, isUserCancelledError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { McpServerTreeItem } from '../explorer/McpServerTreeItem';
import { localize } from '../localize';

export async function copyMcpServerUrl(_context: IActionContext, node?: McpServerTreeItem): Promise<void> {
    try {
        if (!node) {
            return;
        }

        // Get APIM service details including hostname configuration
        const apimService = await node.root.client.apiManagementService.get(
            node.root.resourceGroupName,
            node.root.serviceName
        );

        // Show a quick pick to let user choose the endpoint type
        const endpoints = ['SSE', 'Streamable HTTP'];
        const endpointType = await vscode.window.showQuickPick(endpoints, {
            placeHolder: 'Select endpoint type',
            canPickMany: false
        });

        // Generate the URL based on selected endpoint type
        const baseUrl = `${apimService.gatewayUrl}/${node.mcpServerContract.properties.path}`;
        const url = endpointType === 'SSE' ? `${baseUrl}/sse` : `${baseUrl}/mcp`;

        // Copy to clipboard
        await vscode.env.clipboard.writeText(url);
        vscode.window.showInformationMessage(localize('mcpServerUrl.copied', `${endpointType} endpoint URL has been copied to clipboard.`));

    } catch (error) {
        if (isUserCancelledError(error)) {
            return;
        }
        vscode.window.showErrorMessage(error.message);
        throw error;
    }
}
