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
            title: localize('importingMcpApi', `Importing MCP Server "${apiName}" to "${root.serviceName}"...`),
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
                    
                    // Show a notification with a button to add MCP to VS Code settings
                    const addToSettingsBtn = localize('mcpAddToSettings', 'Try MCP Server in VS Code');
                    vscode.window.showInformationMessage(
                        localize('mcpApiDeploymentSucceeded', `Successfully imported MCP Server to APIM. Endpoint: ${endpoint}. You can try it using VS Code.`),
                        addToSettingsBtn
                    ).then(async selection => {
                        if (selection === addToSettingsBtn && endpoint) {
                            await addMcpServerToVsCodeSettings(endpoint);
                        }
                    });
                }

                // Refresh the tree view
                await node.refresh(context);
            } catch (error) {
                throw new Error(localize('mcpApiDeploymentFailed', `Failed to deploy MCP API: ${error instanceof Error ? error.message : String(error)}`));
            }
        }
    );
}

/**
 * Adds the MCP server to VS Code settings.json
 * @param endpoint The APIM MCP API endpoint
 */
async function addMcpServerToVsCodeSettings(endpoint: string): Promise<void> {
    try {
        // Get the current workspace configuration
        const config = vscode.workspace.getConfiguration();
        
        // Prepare the MCP server configuration
        const mcpInputId = "api-management-subscription-key";
        const mcpInputConfig = {
            type: "promptString",
            id: mcpInputId,
            description: `Please provide API Management Subscription Key in order to access ${endpoint}`,
            password: true
        };
        
        const mcpServerConfig = {
            type: "sse",
            url: endpoint,
            headers: {
                "Ocp-Apim-Subscription-Key": `\${input:${mcpInputId}}`
            }
        };
          // Get existing MCP configuration if it exists
        const existingMcpConfig = config.get<Record<string, any>>("mcp") || {};
        
        // Create a copy of the existing servers without mcp-server-time
        const existingServers = existingMcpConfig.servers || {};
        const filteredServers = Object.keys(existingServers)
            .filter(key => key !== "mcp-server-time")
            .reduce((obj, key) => {
                obj[key] = existingServers[key];
                return obj;
            }, {} as Record<string, any>);

        // Merge with existing configuration if any
        const updatedMcpConfig = {
            inputs: [...(existingMcpConfig.inputs || []), mcpInputConfig],
            servers: {
                ...filteredServers,
                "remote-mcp-function": mcpServerConfig
            }
        };
        
        // Update the configuration
        await config.update("mcp", updatedMcpConfig, vscode.ConfigurationTarget.Global);
        
        // Show success message with a button to open Copilot chat
        const openCopilotChatBtn = localize('mcpOpenCopilotChat', 'Open GitHub Copilot');
        vscode.window.showInformationMessage(
            localize('mcpAddedToSettings', 'MCP server successfully added to VS Code.'),
            openCopilotChatBtn
        ).then(selection => {
            if (selection === openCopilotChatBtn) {
                // Execute the command to open GitHub Copilot chat
                vscode.commands.executeCommand("workbench.action.chat.open", {
                    query: "",
                    mode: "agent"
                });
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(
            localize('mcpAddToSettingsFailed', `Failed to add MCP server to VS Code settings: ${error instanceof Error ? error.message : String(error)}`)
        );
    }
}
