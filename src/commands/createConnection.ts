/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ConnectionsTreeItem, IConnectionTreeItemContext } from "../explorer/ConnectionsTreeItem";
import { TokenProviderTreeItem } from "../explorer/TokenProviderTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function createConnection(context: IActionContext & Partial<IConnectionTreeItemContext>, node?: ConnectionsTreeItem): Promise<void> {
    if (!node) {
        const tokenProviderNode = <TokenProviderTreeItem>await ext.tree.showTreeItemPicker(TokenProviderTreeItem.contextValue, context);
        node = tokenProviderNode.connectionsTreeItem;
    }
    
    const connectionName = await askInput('Enter Connection name ...');
    context.connectionName = connectionName;

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingConnection", `Creating Connection '${connectionName}' for Token Service ${node.root.tokenProviderName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { 
            return node!.createChild(context); 
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("createdConnection", `Created Connection '${connectionName}' in API Management succesfully.`));
    });
}

async function askInput(message: string) : Promise<string> {
    const idPrompt: string = localize('value', message);
    return (await ext.ui.showInputBox({
        prompt: idPrompt
    })).trim();
}