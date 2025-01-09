/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from '../extensionVariables';
import { openInPortal as openInPortalInternal } from "@microsoft/vscode-azext-azureutils"

export async function openInPortal(context: IActionContext,  node?: AzExtTreeItem): Promise<void> {
    if (!node) {
        node = await ext.tree.showTreeItemPicker<AzExtTreeItem>(ServiceTreeItem.contextValue, context);
    }
    await openInPortalInternal(node, node.fullId)
}
