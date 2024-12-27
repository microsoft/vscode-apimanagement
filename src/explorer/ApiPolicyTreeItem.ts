/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { treeUtils } from "../utils/treeUtils";

export class ApiPolicyTreeItem extends AzExtTreeItem {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('policy');
    }
    public static contextValue: string = 'azureApiManagementApiPolicy';
    public label: string = "Policy";
    public contextValue: string = ApiPolicyTreeItem.contextValue;

    public get commandId(): string {
        return 'azureApiManagement.showApiPolicy';
    }
}
