/*--------------------        this._name = nonNullProp(this.mcpServerContract, 'name');
        this.label = this.mcpServerContract.properties.displayName || this._name;-----------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IMcpServerApiContract } from "../azure/apim/contracts";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { McpServerToolsTreeItem } from "./McpServerToolsTreeItem";

export class McpServerTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureApiManagementMcpServer';
    public contextValue: string = McpServerTreeItem.contextValue;
    public label: string;
    private _name: string;
    private readonly toolsTreeItem: McpServerToolsTreeItem;

    constructor(
        parent: AzExtParentTreeItem,
        public readonly mcpServerContract: IMcpServerApiContract,
        public readonly root: IServiceTreeRoot) {
        super(parent);
        this._name = nonNullProp(this.mcpServerContract, 'name');
        this.label = this.mcpServerContract.properties.displayName || this._name;
        this.toolsTreeItem = new McpServerToolsTreeItem(this, this.mcpServerContract);
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('mcp');
    }
    public get id(): string {
        return this._name;
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(): Promise<any[]> {
        return [this.toolsTreeItem];
    }
}
