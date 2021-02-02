/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureTreeItem, IActionContext } from 'vscode-azureextensionui';
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from '../extensionVariables';

export async function openInPortal(context: IActionContext,  node?: AzureTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<AzureTreeItem>(ServiceTreeItem.contextValue, context);
    }
    await node.openInPortal();
}
