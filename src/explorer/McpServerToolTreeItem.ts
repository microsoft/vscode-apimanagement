/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { IMcpToolContract } from "../azure/apim/contracts";
import { treeUtils } from "../utils/treeUtils";

export class McpServerToolTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'azureApiManagementMcpServerTool';
    public contextValue: string = McpServerToolTreeItem.contextValue; public readonly label: string;

    constructor(
        parent: AzExtParentTreeItem,
        public readonly tool: IMcpToolContract) {
        super(parent);
        this.label = tool.name;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('op');
    }

    public get id(): string {
        return this.tool.operationId;
    }

    public get description(): string {
        return this.tool.description || "";
    }
}
