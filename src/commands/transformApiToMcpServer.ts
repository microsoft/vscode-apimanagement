/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  IActionContext,
  isUserCancelledError,
} from "@microsoft/vscode-azext-utils";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { ApiContract, OperationContract } from "@azure/arm-apimanagement";
import * as vscode from "vscode";
import { McpTransformativeTreeItem } from "../explorer/McpTransformativeTreeItem";
import { ApimService } from "../azure/apim/ApimService";
import { localize } from "../localize";
import { IMcpToolContract } from "../azure/apim/contracts";
import { validateMcpServerName } from "../utils/mcpValidationUtil";

interface IApiQuickPickItem {
  label: string;
  api: ApiContract;
}

interface IOperationQuickPickItem {
  label: string;
  description: string;
  operation: OperationContract;
}

export async function transformApiToMcpServer(
  context: IActionContext,
  node?: McpTransformativeTreeItem
): Promise<void> {
  try {
    if (!node) {
      return;
    }

    const selectedApi = await selectApi(context, node);
    if (!selectedApi) {
      return;
    }

    const selectedOperations = await selectOperations(
      context,
      node,
      selectedApi
    );
    if (!selectedOperations || selectedOperations.length === 0) {
      return;
    }

    const mcpServerName = (
      await context.ui.showInputBox({
        prompt: localize(
          "enterMcpServerName",
          "Enter the name for the MCP server"
        ),
        validateInput: validateMcpServerName,
      })
    ).trim();

    const defaultApiUrlSuffix = `${selectedApi.path || selectedApi.name}-mcp`;
    const apiUrlSuffix = (
      await context.ui.showInputBox({
        prompt: localize(
          "enterApiUrlSuffix",
          "Enter the API URL suffix for the MCP server (leave empty for root path)"
        ),
        value: defaultApiUrlSuffix,
      })
    ).trim();

    await createMcpServer(node, selectedApi, selectedOperations, apiUrlSuffix, mcpServerName);

    await node.refresh(context);

    vscode.window.showInformationMessage(
      localize(
        "mcpServerCreated",
        `Successfully created MCP server "${mcpServerName}" from API "${selectedApi.displayName}".`
      )
    );
  } catch (error) {
    if (isUserCancelledError(error)) {
      throw error;
    }

    // azext-utils only show the outer error, which does not include error details.
    // Compose the error message as non JSON format to skip azext-utils' error handling.
    const message = `Failed to transform API to MCP server: ${error.message}`;
    throw new Error(message);
  }
}

async function selectApi(
  context: IActionContext,
  node: McpTransformativeTreeItem
): Promise<ApiContract | undefined> {
  const apis: ApiContract[] = await uiUtils.listAllIterator(
    node.root.client.api.listByService(
      node.root.resourceGroupName,
      node.root.serviceName,
      { expandApiVersionSet: true }
    )
  );

  if (apis.length === 0) {
    vscode.window.showInformationMessage(
      localize(
        "noApisFound",
        "No APIs found in the current API Management service."
      )
    );
    return undefined;
  }

  const apiItems: IApiQuickPickItem[] = apis.map((api) => ({
    label: api.displayName || api.name!,
    api: api,
  }));

  const selectedItem = await context.ui.showQuickPick(apiItems, {
    canPickMany: false,
    placeHolder: localize(
      "selectApi",
      "Select an API to transform to MCP server"
    ),
  });

  return selectedItem.api;
}

async function selectOperations(
  context: IActionContext,
  node: McpTransformativeTreeItem,
  api: ApiContract
): Promise<OperationContract[] | undefined> {
  const operations: OperationContract[] = await uiUtils.listAllIterator(
    node.root.client.apiOperation.listByApi(
      node.root.resourceGroupName,
      node.root.serviceName,
      api.name!
    )
  );

  if (operations.length === 0) {
    vscode.window.showInformationMessage(
      localize(
        "noOperationsFound",
        `No operations found in API "${api.displayName}".`
      )
    );
    return undefined;
  }

  const operationItems: IOperationQuickPickItem[] = operations.map(
    (operation) => ({
      label: operation.displayName!, // Display name is required when create operation, so will not be undefined
      description: operation.description
        ? `${operation.method!.toUpperCase()} - ${operation.description}`
        : operation.method!.toUpperCase(), // Method is required when create operation, so will not be undefined
      operation: operation,
    })
  );

  const selectedItems = await context.ui.showQuickPick(operationItems, {
    canPickMany: true,
    placeHolder: localize(
      "selectOperations",
      "Select one or more operations to include in the MCP server"
    ),
  });

  return selectedItems.map((item) => item.operation);
}

async function createMcpServer(
  node: McpTransformativeTreeItem,
  api: ApiContract,
  operations: OperationContract[],
  apiUrlSuffix: string,
  mcpServerName: string
): Promise<void> {
  const apimService = new ApimService(
    node.root.credentials,
    node.root.environment.resourceManagerEndpointUrl,
    node.root.subscriptionId,
    node.root.resourceGroupName,
    node.root.serviceName
  );

  const originalApiName = api.name!;
  const mcpApiName = mcpServerName;
  const mcpApiDisplayName = mcpServerName; // Use mcpServerName as display name by default
  const mcpApiPath = apiUrlSuffix;

  const mcpTools: IMcpToolContract[] = operations.map((operation) => ({
    name: operation.name!,
    description: operation.description || "",
    operationId: `/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node.root.serviceName}/apis/${originalApiName}/operations/${operation.name}`,
  }));

  const mcpServerPayload = {
    id: `/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node.root.serviceName}/apis/${mcpApiName}`,
    name: mcpApiName,
    properties: {
      type: "mcp",
      displayName: mcpApiDisplayName,
      subscriptionRequired: false,
      path: mcpApiPath,
      protocols: ["http", "https"],
      mcpTools: mcpTools,
    },
  };

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: localize("creatingMcpServer", "Creating MCP server..."),
      cancellable: false,
    },
    async (_progress) => {
      await apimService.createOrUpdateMcpServer(mcpApiName, mcpServerPayload);
    }
  );
}
