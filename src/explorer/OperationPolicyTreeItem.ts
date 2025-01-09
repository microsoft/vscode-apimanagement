/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { treeUtils } from "../utils/treeUtils";
import { IOperationTreeRoot } from "./IOperationTreeRoot";

export class OperationPolicyTreeItem extends AzExtTreeItem {

    public readonly root: IOperationTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IOperationTreeRoot) {
        super(parent);
        this.root = root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('policy');
    }
    public static contextValue: string = 'azureApiManagementOperationPolicy';
    public label: string = "Policy";
    public contextValue: string = OperationPolicyTreeItem.contextValue;
    public get commandId(): string {
        return 'azureApiManagement.showOperationPolicy';
    }
}
