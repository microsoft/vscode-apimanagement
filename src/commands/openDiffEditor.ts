/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from "../extensionVariables";

export async function openDiffEditor(context: IActionContext, uri: vscode.Uri): Promise<void> {
    const localPath = uri.fsPath.replace("-tempFile", '');
    ext.outputChannel.show();
    vscode.commands.executeCommand("vscode.diff", vscode.Uri.file(localPath), vscode.Uri.file(uri.fsPath), 'Original -> Current');
}
