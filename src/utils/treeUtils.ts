/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { AzExtTreeDataProvider, AzureParentTreeItem, AzureTreeItem, SubscriptionTreeItemBase } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';

export namespace treeUtils {
    export interface IThemedIconPath {
        light: string;
        dark: string;
    }

    export function getIconPath(iconName: string): string {
        return path.join(getResourcesPath(), `${iconName}.svg`);
    }

    export function getThemedIconPath(iconName: string): IThemedIconPath {
        return {
            light: path.join(getResourcesPath(), 'light', `${iconName}.svg`),
            dark: path.join(getResourcesPath(), 'dark', `${iconName}.svg`)
        };
    }

    function getResourcesPath(): string {
        return ext.context.asAbsolutePath('resources');
    }

    export async function getSubscriptionNode(tree: AzExtTreeDataProvider, subscriptionId: string): Promise<AzureParentTreeItem> {
        const node: AzureParentTreeItem | undefined = <AzureParentTreeItem | undefined>(await tree.getChildren()).find((n: AzureTreeItem) => n.root.subscriptionId === subscriptionId);
        if (node) {
            return node;
        } else {
            throw new Error(localize('noMatchingSubscription', 'Failed to find a subscription matching id "{0}".', subscriptionId));
        }
    }

    export async function getRootNode(tree: AzExtTreeDataProvider): Promise<AzureParentTreeItem> {
        // need to double check
        return <AzureParentTreeItem>(await tree.getChildren()).find((n: AzureParentTreeItem) => n instanceof SubscriptionTreeItemBase);
    }
}
