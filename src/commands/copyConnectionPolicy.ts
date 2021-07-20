/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import { ConnectionTreeItem } from "../explorer/ConnectionTreeItem";
import { ext } from "../extensionVariables";
import { localize } from '../localize';

export async function copyConnectionPolicy(context: IActionContext, node?: ConnectionTreeItem): Promise<void> {
    if (!node) {
        const connectionNode = <ConnectionTreeItem>await ext.tree.showTreeItemPicker(ConnectionTreeItem.contextValue, context);
        node = connectionNode;
    }

    const tid = node.root.tokenProviderName;
    const cid = node.connectionContract.name;

    vscode.env.clipboard.writeText(`<fetch-token token-provider-id="${tid}" connection-id= "${cid}" variable-name="${tid}-${cid}-token" />`);
    vscode.window.showInformationMessage(localize("CopySnippet", `Policy copied to clipboard.`));
}