/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureTreeItem } from "vscode-azureextensionui";
import { treeUtils } from "../utils/treeUtils";
import { IOperationTreeRoot } from "./IOperationTreeRoot";

export class OperationPolicyTreeItem extends AzureTreeItem<IOperationTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('policy');
    }
    public static contextValue: string = 'azureApiManagementOperationPolicy';
    public label: string = "Policy";
    public contextValue: string = OperationPolicyTreeItem.contextValue;
    public readonly commandId: string = 'azureApiManagement.showOperationPolicy';
}
