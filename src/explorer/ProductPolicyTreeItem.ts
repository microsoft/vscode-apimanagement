/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureTreeItem } from "vscode-azureextensionui";
import { treeUtils } from "../utils/treeUtils";
import { IProductTreeRoot } from "./IProductTreeRoot";

export class ProductPolicyTreeItem extends AzureTreeItem<IProductTreeRoot> {

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('policy');
    }
    public static contextValue: string = 'azureApiManagementProductPolicy';
    public label: string = "Policy";
    public contextValue: string = ProductPolicyTreeItem.contextValue;
    public readonly commandId: string = 'azureApiManagement.showProductPolicy';
}
