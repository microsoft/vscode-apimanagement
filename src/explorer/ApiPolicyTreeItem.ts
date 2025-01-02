/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { treeUtils } from "../utils/treeUtils";
import { IApiTreeRoot } from "./IApiTreeRoot";

export class ApiPolicyTreeItem extends AzExtTreeItem {

    public readonly root: IApiTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IApiTreeRoot) {
        super(parent);
        this.root = root;
    }

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
