/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { SubscriptionTreeItem } from '../explorer/SubscriptionTreeItem';
import { ext } from '../extensionVariables';
import { localize } from '../localize';

export async function copySubscriptionKeyValue(context: IActionContext, node?: SubscriptionTreeItem): Promise<void> {
    if (!node) {
        node = <SubscriptionTreeItem>await ext.tree.showTreeItemPicker(SubscriptionTreeItem.contextValue, context);
    }
    
    try {
        // Get the subscription keys
        const subscriptionKeys = await node.root.client.subscription.listSecrets(
            node.root.resourceGroupName, 
            node.root.serviceName, 
            node.root.subscriptionSid
        );
        
        // Choose which key to copy - by default use primary
        if (!subscriptionKeys.primaryKey && !subscriptionKeys.secondaryKey) {
            throw new Error(localize("NoSubscriptionKeys", "No subscription keys are available."));
        }
        
        const primaryKeyAvailable = !!subscriptionKeys.primaryKey;
        const secondaryKeyAvailable = !!subscriptionKeys.secondaryKey;
        
        // If both keys are available, ask which one to copy
        let keyToCopy: string | undefined;
        
        if (primaryKeyAvailable && secondaryKeyAvailable) {
            const selection = await context.ui.showQuickPick(
                [
                    { label: 'Primary Key', key: subscriptionKeys.primaryKey },
                    { label: 'Secondary Key', key: subscriptionKeys.secondaryKey }
                ],
                { placeHolder: 'Select which subscription key to copy' }
            );
            if (!selection) {
                // User canceled the QuickPick
                return;
            }
            keyToCopy = selection.key;
        } else {
            // Use whichever key is available
            keyToCopy = subscriptionKeys.primaryKey || subscriptionKeys.secondaryKey;
        }
        
        if (!keyToCopy) {
            throw new Error(localize("CopySubscriptionKey", "Could not find a valid subscription key."));
        }
        
        // Copy the key to clipboard
        await vscode.env.clipboard.writeText(keyToCopy);
        vscode.window.showInformationMessage(localize("SubscriptionKeyCopied", "Subscription key has been copied to clipboard."));
    } catch (error) {
        vscode.window.showErrorMessage(localize("ErrorCopyingSubscriptionKey", `Error copying subscription key: ${error instanceof Error ? error.message : String(error)}`));
        throw error;
    }
}
