/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from '../extensionVariables';

export async function copySubscriptionKey(context: IActionContext, node?: ServiceTreeItem): Promise<void> {
    if (!node) {
        node = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
    }
    const key = await node.copySubscriptionKey();
    vscode.env.clipboard.writeText(key);
}
