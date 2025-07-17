/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { treeUtils } from "../utils/treeUtils";
import { IMcpServerApiContract } from "../azure/apim/contracts";
import { McpServerToolTreeItem } from "./McpServerToolTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";
import { ITreeItemWithRoot } from "./ITreeItemWithRoot";

export class McpServerToolsTreeItem extends AzExtParentTreeItem implements ITreeItemWithRoot<IApiTreeRoot> {
    public static contextValue: string = 'azureApiManagementMcpServerTools';
    public contextValue: string = McpServerToolsTreeItem.contextValue;
    public readonly label: string = "Tools";

    constructor(
        parent: AzExtParentTreeItem,
        public readonly mcpServer: IMcpServerApiContract,
        public readonly root: IApiTreeRoot) {
        super(parent);
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }

    public get commandId(): string {
        return 'azureApiManagement.showArmMcpServerTools';
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(): Promise<AzExtTreeItem[]> {
        const tools = this.mcpServer.properties.mcpTools || [];
        return this.createTreeItemsWithErrorHandling(
            tools,
            "invalidApiManagementMcpServerTool",
            async (tool) => new McpServerToolTreeItem(this, tool),
            (tool) => tool.name
        );
    }
}
