/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ApiTreeItem } from "../../explorer/ApiTreeItem";
import { ext } from "../../extensionVariables";

// tslint:disable-next-line: export-name
export async function debugApiPolicy(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    const debugConfig: vscode.DebugConfiguration = {
        type: "apim-policy",
        request: "launch",
        name: "Attach to APIM",
        stopOnEntry: true
    };

    await vscode.debug.startDebugging(undefined, debugConfig);
}
