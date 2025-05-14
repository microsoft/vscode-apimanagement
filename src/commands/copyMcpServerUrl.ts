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

        // Show a quick pick to let user choose the endpoint type
        const endpointType = await context.ui.showQuickPick(
            [
                { label: 'SSE' },
                { label: 'Streamable HTTP' }
            ],
            { placeHolder: 'Select endpoint type' }
        );

        // Generate the URL based on selected endpoint type
        const baseUrl = `${apimService.gatewayUrl}/${node.mcpServerContract.properties.path}`;
        const url = endpointType.label === 'SSE' ? `${baseUrl}/sse` : `${baseUrl}/mcp`;

        // Copy to clipboard
        await vscode.env.clipboard.writeText(url);
        vscode.window.showInformationMessage(localize('mcpServerUrl.copied', `${endpointType.label} endpoint URL has been copied to clipboard.`));

    } catch (error) {
        if (isUserCancelledError(error)) {
            return;
        }
        vscode.window.showErrorMessage(error.message);
        throw error;
    }
}
