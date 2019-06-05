/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureTreeItem } from "vscode-azureextensionui";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class ServicePolicyTreeItem extends AzureTreeItem<IServiceTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('policy');
    }
    public static contextValue: string = 'azureApiManagementServicePolicy';
    public label: string = "Policy";
    public contextValue: string = ServicePolicyTreeItem.contextValue;
    public readonly commandId: string = 'azureApiManagement.showServicePolicy';
}
