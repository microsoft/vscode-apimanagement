/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { SubscriptionTreeItemBase } from '@microsoft/vscode-azext-azureutils';
import { ext } from '../extensionVariables';
import { treeUtils } from '../utils/treeUtils';

export async function createService(context: IActionContext, subscription?: AzExtParentTreeItem | string, _resourceGroup?: string): Promise<string> {
    let node: AzExtParentTreeItem;
    if (typeof subscription === 'string') {
        node = await treeUtils.getSubscriptionNode(ext.tree, subscription);
    } else if (!subscription) {
        node = <AzExtParentTreeItem>await ext.tree.showTreeItemPicker(SubscriptionTreeItemBase.contextValue, context);
    } else {
        node = subscription;
    }

    const serviceNode: AzExtTreeItem = await node.createChild(context);
    return serviceNode.fullId;
}
