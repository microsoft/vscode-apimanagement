/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { treeUtils } from "../utils/treeUtils";

export class ServicePolicyTreeItem extends AzExtTreeItem {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('policy');
    }
    public static contextValue: string = 'azureApiManagementServicePolicy';
    public label: string = "Global Policy";
    public contextValue: string = ServicePolicyTreeItem.contextValue;
    public get commandId(): string {
        return 'azureApiManagement.showServicePolicy';
    }

    constructor(parent: AzExtParentTreeItem) {
        super(parent);
    }
}
