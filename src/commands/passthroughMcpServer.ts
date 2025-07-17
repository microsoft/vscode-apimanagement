/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
  IActionContext,
  isUserCancelledError,
} from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import * as crypto from "crypto";
import { BackendContract } from "@azure/arm-apimanagement";
import { McpPassthroughTreeItem } from "../explorer/McpPassthroughTreeItem";
import { ApimService } from "../azure/apim/ApimService";
import { localize } from "../localize";
import { validateMcpServerName } from "../utils/mcpValidationUtil";

interface McpServerConfig {
  mcpServerName: string;
  mcpServerUrl: string;
  apiUrlSuffix: string;
  protocolType: string;
  sseEndpoint?: string;
  messagesEndpoint?: string;
}

export async function passthroughMcpServer(
  context: IActionContext,
  node?: McpPassthroughTreeItem
): Promise<void> {
  try {
    if (!node) {
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

    const protocolChoice = await context.ui.showQuickPick(
      [
        { label: "SSE", description: "Server-Sent Events" },
        { label: "Streamable HTTP", description: "Streamable HTTP protocol" },
      ],
      {
        placeHolder: localize(
          "selectProtocol",
          "Select the transport protocol for the MCP server"
        ),
      }
    );

    const mcpServerUrl = (
      await context.ui.showInputBox({
        prompt: localize(
          "enterMcpServerUrl",
          "Enter the URL of the MCP server"
        ),
        validateInput: (value: string): string | undefined => {
          if (!value || value.trim().length === 0) {
            return localize("urlRequired", "URL is required");
          }
          if (!value.trim().match(/^https?:\/\/.+/)) {
            return localize(
              "invalidUrl",
              "Please enter a valid URL starting with http:// or https://"
            );
          }
          return undefined;
        },
      })
    ).trim();

    const apiUrlSuffix = (
      await context.ui.showInputBox({
        prompt: localize("enterApiUrlSuffix", "Enter the APIM API URL suffix"),
        value: mcpServerName, // Default to the server name
        validateInput: (value: string): string | undefined => {
          if (!value || value.trim().length === 0) {
            return localize(
              "apiUrlSuffixRequired",
              "API URL suffix is required"
            );
          }
          return undefined;
        },
      })
    ).trim();

    let sseEndpoint = "";
    let messagesEndpoint = "";

    // For SSE protocol, ask for SSE and Messages endpoints
    if (protocolChoice.label === "SSE") {
      sseEndpoint = (
        await context.ui.showInputBox({
          prompt: localize(
            "enterSseEndpoint",
            "Enter the SSE endpoint path (relative to the MCP server URL)"
          ),
          value: "/sse", // Default value
          validateInput: (value: string): string | undefined => {
            if (!value || value.trim().length === 0) {
              return localize(
                "sseEndpointRequired",
                "SSE endpoint is required"
              );
            }
            return undefined;
          },
        })
      ).trim();

      messagesEndpoint = (
        await context.ui.showInputBox({
          prompt: localize(
            "enterMessagesEndpoint",
            "Enter the Messages endpoint path (relative to the MCP server URL)"
          ),
          value: "/messages", // Default value
          validateInput: (value: string): string | undefined => {
            if (!value || value.trim().length === 0) {
              return localize(
                "messagesEndpointRequired",
                "Messages endpoint is required"
              );
            }
            return undefined;
          },
        })
      ).trim();
    }

    // Create MCP server resources
    const config: McpServerConfig = {
      mcpServerName,
      mcpServerUrl,
      apiUrlSuffix,
      protocolType: protocolChoice.label,
      sseEndpoint: protocolChoice.label === "SSE" ? sseEndpoint : undefined,
      messagesEndpoint:
        protocolChoice.label === "SSE" ? messagesEndpoint : undefined,
    };

    await createMcpServer(node, config);

    await node.refresh(context);

    vscode.window.showInformationMessage(
      localize(
        "mcpServerPassthroughCreated",
        `Successfully proxied MCP server "${mcpServerName}" with ${protocolChoice.label} protocol.`
      )
    );
  } catch (error) {
    if (isUserCancelledError(error)) {
      throw error;
    }

    // azext-utils only show the outer error, which does not include error details.
    // Compose the error message as non JSON format to skip azext-utils' error handling.
    const message = `Failed to proxy MCP server: ${error.message}`;
    throw new Error(message);
  }
}

async function createMcpServer(
  node: McpPassthroughTreeItem,
  config: McpServerConfig
): Promise<void> {
  const backendName = crypto.randomUUID(); // Use guid as name to avoid conflict
  const backendContract: BackendContract = {
    url: config.mcpServerUrl,
    protocol: "http",
  };

  // Create the backend
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: localize("creatingBackend", "Creating APIM backend for MCP..."),
      cancellable: false,
    },
    async (_progress) => {
      await node.root.client.backend.createOrUpdate(
        node.root.resourceGroupName,
        node.root.serviceName,
        backendName,
        backendContract
      );
    }
  );

  // Create the MCP server payload
  let mcpServerPayload: any = {
    properties: {
      displayName: config.mcpServerName, // Use mcpServerName as displayName by default
      protocols: ["http", "https"],
      description: "This API is used to passthrough existing MCP server.",
      subscriptionRequired: false,
      path: config.apiUrlSuffix,
      type: "mcp",
      backendId: backendName,
    },
  };

  // Add MCP properties only for SSE protocol
  if (config.protocolType === "SSE") {
    mcpServerPayload.properties.mcpProperties = {
      transportType: "sse",
      endpoints: {
        sse: {
          method: "GET",
          uriTemplate: config.sseEndpoint,
        },
        messages: {
          method: "POST",
          uriTemplate: config.messagesEndpoint,
        },
      },
    };
  }

  // Create the MCP server
  const apimService = new ApimService(
    node.root.credentials,
    node.root.environment.resourceManagerEndpointUrl,
    node.root.subscriptionId,
    node.root.resourceGroupName,
    node.root.serviceName
  );

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: localize("creatingMcpServer", "Creating MCP server..."),
      cancellable: false,
    },
    async (_progress) => {
      await apimService.createOrUpdateMcpServer(
        config.mcpServerName.trim(),
        mcpServerPayload
      );
    }
  );
}
