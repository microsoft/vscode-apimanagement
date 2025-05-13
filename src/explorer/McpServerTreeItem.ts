/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IMcpServerApiContract } from "../azure/apim/contracts";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { McpServerToolsTreeItem } from "./McpServerToolsTreeItem";
import { ApiPolicyTreeItem } from "./ApiPolicyTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";

export class McpServerTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureApiManagementMcpServer';
    public contextValue: string = McpServerTreeItem.contextValue;
    public label: string;
    public policyTreeItem: ApiPolicyTreeItem;
    private _name: string;
    private _root: IApiTreeRoot;
    private readonly toolsTreeItem: McpServerToolsTreeItem;

    constructor(
        parent: AzExtParentTreeItem,
        public readonly mcpServerContract: IMcpServerApiContract,
        root: IServiceTreeRoot) {
        super(parent);
        this.label = nonNullProp(this.mcpServerContract.properties, 'displayName');

        this._name = nonNullProp(this.mcpServerContract, 'name');
        this._root = this.createRoot(root, this._name);

        this.toolsTreeItem = new McpServerToolsTreeItem(this, this.mcpServerContract);
        this.policyTreeItem = this.policyTreeItem = new ApiPolicyTreeItem(this, this._root);
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('mcp', 'png');
    }
    
    public get id(): string {
        return this._name;
    }

    public get root(): IApiTreeRoot {
        return this._root;
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(): Promise<any[]> {
        return [this.toolsTreeItem, this.policyTreeItem];
    }

    private createRoot(subRoot: IServiceTreeRoot, apiName: string): IApiTreeRoot {
        return Object.assign({}, <IServiceTreeRoot>subRoot, {
            apiName: apiName
        });
    }
}
