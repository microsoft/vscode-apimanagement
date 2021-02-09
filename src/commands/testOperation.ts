/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { ApiOperationTreeItem } from "../explorer/ApiOperationTreeItem";
import { ext } from '../extensionVariables';
import { createTemporaryFile } from "../utils/fsUtil";
import { nameUtil } from '../utils/nameUtil';
import { writeToEditor } from '../utils/vscodeUtils';

export async function testOperation(context: IActionContext, node?: ApiOperationTreeItem): Promise<void> {
    if (!node) {
        node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue, context);
    }
    // tslint:disable-next-line: no-non-null-assertion
    await createOperationTestFile(node!, OperationRunMode.test);
}

export async function createOperationTestFile(node: ApiOperationTreeItem, mode: OperationRunMode): Promise<vscode.TextEditor> {
    // using https://github.com/Huachao/vscode-restclient
    const fileName = `${nameUtil(node.root)}.http`;
    const localFilePath: string = await createTemporaryFile(fileName);
    let data: string;
    if (mode === OperationRunMode.debug) {
        data = await node.getOperationDebugInfo();
    } else {
        data = await node.getOperationTestInfo();
    }
    const document: vscode.TextDocument = await vscode.workspace.openTextDocument(localFilePath);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(document);
    await writeToEditor(textEditor, data);
    await textEditor.document.save();
    return textEditor;
}

export enum OperationRunMode {
    debug = "debug",
    test = "test"
}
