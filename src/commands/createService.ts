/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureParentTreeItem, AzureTreeItem, IActionContext, SubscriptionTreeItemBase } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { treeUtils } from '../utils/treeUtils';

export async function createService(context: IActionContext, subscription?: AzureParentTreeItem | string, _resourceGroup?: string): Promise<string> {
    let node: AzureParentTreeItem;
    if (typeof subscription === 'string') {
        node = await treeUtils.getSubscriptionNode(ext.tree, subscription);
    } else if (!subscription) {
        node = <AzureParentTreeItem>await ext.tree.showTreeItemPicker(SubscriptionTreeItemBase.contextValue, context);
    } else {
        node = subscription;
    }

    const serviceNode: AzureTreeItem = await node.createChild(context);
    return serviceNode.fullId;
}
