/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import { ApiContract, OperationContract } from '@azure/arm-apimanagement';
import * as vscode from 'vscode';
import { McpServersTreeItem } from '../explorer/McpServersTreeItem';
import { ApimService } from '../azure/apim/ApimService';
import { localize } from '../localize';
import { apiUtil } from '../utils/apiUtil';
import { IMcpToolContract } from '../azure/apim/contracts';

interface IApiQuickPickItem {
    label: string;
    api: ApiContract;
}

interface IOperationQuickPickItem {
    label: string;
    description: string;
    operation: OperationContract;
}

export async function transformApiToMcpServer(context: IActionContext, node?: McpServersTreeItem): Promise<void> {
    try {
        if (!node) {
            return;
        }

        // Step 1: Show list of APIs and let user select one
        const selectedApi = await selectApi(context, node);
        if (!selectedApi) {
            return;
        }

        // Step 2: Show operations of the selected API and let user select one or more
        const selectedOperations = await selectOperations(context, node, selectedApi);
        if (!selectedOperations || selectedOperations.length === 0) {
            return;
        }

        // Step 3: Create MCP server with selected operations
        await createMcpServer(context, node, selectedApi, selectedOperations);

        // Refresh the tree view to show the new MCP server
        await node.refresh(context);

        vscode.window.showInformationMessage(
            localize('mcpServerCreated', `Successfully created MCP server from API "${selectedApi.displayName}".`)
        );

    } catch (error) {
        vscode.window.showErrorMessage(`Failed to transform API to MCP server: ${error.message}`);
        throw error;
    }
}

async function selectApi(context: IActionContext, node: McpServersTreeItem): Promise<ApiContract | undefined> {
    // Get all APIs from the service
    const apiCollection: ApiContract[] = await uiUtils.listAllIterator(
        node.root.client.api.listByService(node.root.resourceGroupName, node.root.serviceName, { expandApiVersionSet: true })
    );

    // Filter out revisions and prepare for quick pick
    const apis = apiCollection.filter(api => apiUtil.isNotApiRevision(api));
    
    if (apis.length === 0) {
        vscode.window.showInformationMessage(localize('noApisFound', 'No APIs found in the current API Management service.'));
        return undefined;
    }

    const apiItems: IApiQuickPickItem[] = apis.map(api => ({
        label: api.displayName || api.name!,
        api: api
    }));

    const selectedItem = await context.ui.showQuickPick(
        apiItems,
        { 
            canPickMany: false, 
            placeHolder: localize('selectApi', 'Select an API to transform to MCP server')
        }
    );

    return selectedItem.api;
}

async function selectOperations(context: IActionContext, node: McpServersTreeItem, api: ApiContract): Promise<OperationContract[] | undefined> {
    // Get all operations for the selected API
    const operations: OperationContract[] = await uiUtils.listAllIterator(
        node.root.client.apiOperation.listByApi(node.root.resourceGroupName, node.root.serviceName, api.name!)
    );

    if (operations.length === 0) {
        vscode.window.showInformationMessage(
            localize('noOperationsFound', `No operations found in API "${api.displayName}".`)
        );
        return undefined;
    }
    
    const operationItems: IOperationQuickPickItem[] = operations.map(operation => ({
        label: operation.displayName || operation.name!,
        description: operation.description ? `${operation.method?.toUpperCase()} - ${operation.description}` : operation.method?.toUpperCase() || '',
        operation: operation
    }));

    const selectedItems = await context.ui.showQuickPick(
        operationItems,
        { 
            canPickMany: true, 
            placeHolder: localize('selectOperations', 'Select one or more operations to include in the MCP server')
        }
    );

    return selectedItems.map(item => item.operation);
}

async function createMcpServer(
    _context: IActionContext, 
    node: McpServersTreeItem, 
    api: ApiContract, 
    operations: OperationContract[]
): Promise<void> {
    const apimService = new ApimService(
        node.root.credentials,
        node.root.environment.resourceManagerEndpointUrl,
        node.root.subscriptionId,
        node.root.resourceGroupName,
        node.root.serviceName
    );

    // Compose MCP API details
    const originalApiName = api.name!;
    const mcpApiName = `${originalApiName}-mcp`;
    const mcpApiDisplayName = `${api.displayName || originalApiName} MCP`;
    const mcpApiPath = `${api.path!}-mcp`;

    // Create MCP tools from selected operations
    const mcpTools: IMcpToolContract[] = operations.map(operation => ({
        name: operation.name!,
        description: operation.description || '',
        operationId: `/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node.root.serviceName}/apis/${originalApiName}/operations/${operation.name}`
    }));

    // Prepare the request body for creating MCP server
    const mcpServerPayload = {
        id: `/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node.root.serviceName}/apis/${mcpApiName}`,
        name: mcpApiName,
        properties: {
            type: "mcp",
            displayName: mcpApiDisplayName,
            subscriptionRequired: false,
            path: mcpApiPath,
            protocols: ["http", "https"],
            mcpTools: mcpTools
        }
    };

    // Create the MCP server using the API Management REST API
    await apimService.createMcpServer(mcpApiName, mcpServerPayload);
}
