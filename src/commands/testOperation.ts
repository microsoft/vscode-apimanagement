/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ApiOperationTreeItem } from "../explorer/ApiOperationTreeItem";
import { ext } from '../extensionVariables';
import { createTemporaryFile } from "../utils/fsUtil";
import { nameUtil } from '../utils/nameUtil';
import { writeToEditor } from '../utils/vscodeUtils';

export async function testOperation(node?: ApiOperationTreeItem): Promise<void> {
    if (!node) {
        node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue);
    }

    // using https://github.com/Huachao/vscode-restclient
    const fileName = `${nameUtil(node.root)}.http`;
    const localFilePath: string = await createTemporaryFile(fileName);
    const data: string = await node.getOperationTestInfo();
    const document: vscode.TextDocument = await vscode.workspace.openTextDocument(localFilePath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(document);
    await writeToEditor(textEditor, data);
    await textEditor.document.save();
}
