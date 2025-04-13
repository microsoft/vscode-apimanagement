/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceManagementClient } from '@azure/arm-resources';
import * as vscode from 'vscode';
import { IActionContext, ISubscriptionActionContext } from '@microsoft/vscode-azext-utils';
import { createAzureClient } from '@microsoft/vscode-azext-azureutils';
import { ext } from '../extensionVariables';
import { ApisTreeItem } from '../explorer/ApisTreeItem';
import { IServiceTreeRoot } from '../explorer/IServiceTreeRoot';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs';
import { localize } from '../localize';

interface DeploymentOutputs {
    apimOauthCallback?: {
        value: string;
    };
}

export async function addMcpOauthEndpoints(context: IActionContext, node?: ApisTreeItem): Promise<void> {
    if (!node) {
        node = <ApisTreeItem>await ext.tree.showTreeItemPicker(ApisTreeItem.contextValue, context);
    }

    // Get Entra ID parameters
    const entraAppClientId = await vscode.window.showInputBox({
        prompt: localize('azureApiManagement.enterClientId', 'Enter the Entra application (client) ID'),
        validateInput: (value: string) => {
            return value ? undefined : localize('azureApiManagement.clientIdRequired', 'Client ID is required');
        },
        ignoreFocusOut: true
    });

    if (!entraAppClientId) {
        return; // User cancelled
    }

    const entraAppClientSecret = await vscode.window.showInputBox({
        prompt: localize('azureApiManagement.enterClientSecret', 'Enter the Entra application client secret'),
        password: true,
        validateInput: (value: string) => {
            return value ? undefined : localize('azureApiManagement.clientSecretRequired', 'Client secret is required');
        },
        ignoreFocusOut: true
    });

    if (!entraAppClientSecret) {
        return; // User cancelled
    }

    const entraAppTenantId = await vscode.window.showInputBox({
        prompt: localize('azureApiManagement.enterTenantId', 'Enter the Entra directory (tenant) ID'),
        validateInput: (value: string) => {
            return value ? undefined : localize('azureApiManagement.tenantIdRequired', 'Tenant ID is required');
        },
        ignoreFocusOut: true
    });

    if (!entraAppTenantId) {
        return; // User cancelled
    }

    const oauthScope = await vscode.window.showInputBox({
        prompt: localize('azureApiManagement.enterOAuthScope', 'Enter the Entra ID OAuth scope'),
        value: 'https://graph.microsoft.com/.default',
        validateInput: (value: string) => {
            return value ? undefined : localize('azureApiManagement.oauthScopeRequired', 'OAuth scope is required');
        },
        ignoreFocusOut: true
    });

    if (!oauthScope) {
        return; // User cancelled
    }

    // Generate encryption keys
    const encryptionKey = crypto.randomBytes(32).toString('base64');
    const encryptionIV = crypto.randomBytes(16).toString('base64');

    try {
        const root: IServiceTreeRoot = node.root;
        const resourceGroupName: string = root.resourceGroupName;
        const serviceName: string = root.serviceName;
        
        // Show deployment status
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: localize('azureApiManagement.deployingOAuthEndpoints', 'Deploying MCP OAuth endpoints to {0}...', serviceName),
            cancellable: false
        }, async () => {
            try {
                // Get template path
                const templatePath = path.join(ext.context.extensionPath, 'resources', 'armTemplates', 'oauth.json');
                const templateContent = fs.readFileSync(templatePath, 'utf8');
                
                // Create a resource management client for deploying the ARM template
                const azContext: ISubscriptionActionContext = { ...context, ...root };
                const resourceGroupsClient: ResourceManagementClient = createAzureClient<ResourceManagementClient>(azContext, ResourceManagementClient);

                // Prepare deployment parameters
                const parameters = {
                    apimServiceName: {
                        value: serviceName
                    },
                    entraAppClientId: {
                        value: entraAppClientId
                    },
                    entraAppClientSecret: {
                        value: entraAppClientSecret
                    },
                    entraAppTenantId: {
                        value: entraAppTenantId
                    },
                    oauthScopes: {
                        value: oauthScope
                    },
                    encryptionIV: {
                        value: encryptionIV
                    },
                    encryptionKey: {
                        value: encryptionKey
                    }
                };                // Deploy the ARM template
                const deployment = await resourceGroupsClient.deployments.beginCreateOrUpdateAndWait(
                    resourceGroupName,
                    `mcp-oauth-${Date.now()}`,
                    {
                        properties: {
                            mode: 'Incremental',
                            template: JSON.parse(templateContent),
                            parameters
                        }
                    }
                );

                // Get the OAuth callback URL from deployment outputs
                const outputs = deployment.properties?.outputs as DeploymentOutputs;
                if (outputs?.apimOauthCallback?.value) {
                    void vscode.window.showInformationMessage(
                        localize(
                            'azureApiManagement.configureOAuthCallback',
                            'Important: Add this OAuth callback URL to the Redirect URIs in your Entra App registration: {0}',
                            outputs.apimOauthCallback.value
                        )
                    );
                }
            } catch (error) {
                throw new Error(localize('azureApiManagement.deploymentFailed', 'Failed to deploy OAuth endpoints: {0}', error instanceof Error ? error.message : String(error)));
            }
        });
    } catch (error) {
        vscode.window.showErrorMessage(localize('azureApiManagement.addMcpOauthEndpointsFailed', 'Failed to add MCP OAuth endpoints: {0}', error instanceof Error ? error.message : String(error)));
        throw error;
    }
}
