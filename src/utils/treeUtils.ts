/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { AzExtTreeDataProvider, AzExtParentTreeItem, AzExtTreeItem } from '@microsoft/vscode-azext-utils';
import { SubscriptionTreeItemBase } from '@microsoft/vscode-azext-azureutils';
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

    export async function getSubscriptionNode(tree: AzExtTreeDataProvider, subscriptionId: string): Promise<AzExtParentTreeItem> {
        const node: AzExtParentTreeItem | undefined = <AzExtParentTreeItem | undefined>(await tree.getChildren()).find((n: AzExtTreeItem) => n.subscription.subscriptionId === subscriptionId);
        if (node) {
            return node;
        } else {
            throw new Error(localize('noMatchingSubscription', 'Failed to find a subscription matching id "{0}".', subscriptionId));
        }
    }

    export async function getRootNode(tree: AzExtTreeDataProvider): Promise<AzExtParentTreeItem> {
        // need to double check
        return <AzExtParentTreeItem>(await tree.getChildren()).find((n: AzExtParentTreeItem) => n instanceof SubscriptionTreeItemBase);
    }
}
