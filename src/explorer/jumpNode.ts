/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzExtTreeItem, AzExtParentTreeItem, GenericTreeItem } from '@microsoft/vscode-azext-utils';

/**
 * A TreeDataProvider using AzExtParentTreeItem that contains a GenericTreeItem child node.
 * The child node executes the 'workbench.view.explorer' command when clicked.
 */  
export class JumpNodeProvider extends AzExtParentTreeItem {
    public static contextValue: string = 'jumpNodeProvider';
    public contextValue: string = JumpNodeProvider.contextValue;
    public label: string = 'Jump Navigation';

    constructor() {
        // Pass undefined as parent since this is the root
        super(undefined);
    }

    public async loadMoreChildrenImpl(): Promise<AzExtTreeItem[]> {
        // Return a single GenericTreeItem child
        return [
            new GenericTreeItem(this, {
                label: "Jump to API Catalog",
                commandId: 'azureApiManagement.jumpToApiCatalog',
                contextValue: "azureCommand",
                id: 'apiManagementExplorer.jumpNode',
                iconPath: new vscode.ThemeIcon("link-external"),
            })
        ];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }
}