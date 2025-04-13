/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import { ResourceManagementClient } from "@azure/arm-resources";
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { createAzureClient } from "@microsoft/vscode-azext-azureutils";
import { ApisTreeItem } from "../explorer/ApisTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function importMcpServer(context: IActionContext, node?: ApisTreeItem): Promise<void> {
    if (!node) {
        // If the node is not provided (command executed from command palette)
        // Find the node in the tree
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.apisTreeItem;
    }

    const root = node.root;
    
    // Get inputs from user
    const mcpEndpoint = await context.ui.showInputBox({
        prompt: localize('mcpEndpointPrompt', 'Enter the MCP Server endpoint URL')
    });

    const messageUrl = await context.ui.showInputBox({
        prompt: localize('mcpMessageUrlPrompt', 'Enter the MCP message URL path'),
        value: 'messages', // default value from ARM template
        placeHolder: 'messages'
    });

    const sseUrl = await context.ui.showInputBox({
        prompt: localize('mcpSseUrlPrompt', 'Enter the MCP SSE URL path'),
        value: 'sse', // default value from ARM template
        placeHolder: 'sse'
    });

    const apiName = await context.ui.showInputBox({
        prompt: localize('mcpApiNamePrompt', 'Enter a name for the APIM API'),
        value: 'mcp', // default value from ARM template
        placeHolder: 'mcp'    });

    const urlSuffix = await context.ui.showInputBox({
        prompt: localize('mcpUrlSuffixPrompt', 'Enter URL suffix for the API in APIM gateway'),
        value: 'mcp', // default value from ARM template
        placeHolder: 'mcp'
    });

    const templatePath = path.join(ext.context.extensionPath, 'resources', 'armTemplates', 'mcp-api.json');
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    
    // Use ResourceManagementClient for ARM template deployment
    const azContext = { ...context, ...root };
    const resourceGroupsClient = createAzureClient(azContext, ResourceManagementClient);

    const parameters = {
        apimServiceName: {
            value: root.serviceName
        },
        mcpEndpoint: {
            value: mcpEndpoint
        },
        mcpApiName: {
            value: apiName
        },
        apiUrlSuffix: {
            value: urlSuffix
        },
        messageUrl: {
            value: messageUrl
        },
        sseUrl: {
            value: sseUrl
        }    };

    await vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title: localize('importingMcpApi', `Importing MCP API "${apiName}" to "${root.serviceName}"...`),
            cancellable: false
        },
        async () => {
            try {
                // Deploy the ARM template using ResourceManagementClient
                const deployment = await resourceGroupsClient.deployments.beginCreateOrUpdateAndWait(
                    root.resourceGroupName,
                    `mcp-api-${Date.now()}`,
                    {
                        properties: {
                            mode: 'Incremental',
                            template: JSON.parse(templateContent),
                            parameters
                        }
                    }
                );

                // Get apimMcpApiEndpoint from deployment outputs
                const outputs = deployment.properties?.outputs as { apimMcpApiEndpoint: { value: string } };
                if (outputs?.apimMcpApiEndpoint?.value) {
                    const endpoint = outputs.apimMcpApiEndpoint.value;
                    const successMsg = localize('mcpApiDeploymentSucceeded', `Successfully deployed MCP API. Endpoint: ${endpoint}`);
                    await vscode.window.showInformationMessage(successMsg);
                }

                // Refresh the tree view
                await node.refresh(context);
            } catch (error) {
                throw new Error(localize('mcpApiDeploymentFailed', `Failed to deploy MCP API: ${error instanceof Error ? error.message : String(error)}`));
            }
        }
    );
}
