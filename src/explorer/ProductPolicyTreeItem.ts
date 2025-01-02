/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { treeUtils } from "../utils/treeUtils";
import { IProductTreeRoot } from "./IProductTreeRoot";

export class ProductPolicyTreeItem extends AzExtTreeItem {

    public readonly root: IProductTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IProductTreeRoot) {
        super(parent);
        this.root = root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('policy');
    }
    public static contextValue: string = 'azureApiManagementProductPolicy';
    public label: string = "Policy";
    public contextValue: string = ProductPolicyTreeItem.contextValue;
    public get commandId(): string {
        return 'azureApiManagement.showProductPolicy';
    }
}
