/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { getDefaultWorkspacePath } from './fsUtil';

// tslint:disable-next-line:export-name
export async function writeToEditor(editor: vscode.TextEditor, data: string): Promise<void> {
    await editor.edit((editBuilder: vscode.TextEditorEdit) => {
        if (editor.document.lineCount > 0) {
            const lastLine: vscode.TextLine = editor.document.lineAt(editor.document.lineCount - 1);
            editBuilder.delete(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lastLine.range.start.line, lastLine.range.end.character)));
        }
        editBuilder.insert(new vscode.Position(0, 0), data);
    });
}

export function workingFolderOpenedInWorkspace(): boolean {
    let folderInWorkspace: boolean = true;
    if (vscode.workspace.workspaceFolders !== undefined
        && vscode.workspace.workspaceFolders.length > 0) {
        const folder = vscode.workspace.workspaceFolders.find((w) => w.uri.fsPath === getDefaultWorkspacePath());
        if (!folder) {
            folderInWorkspace = false;
        }
    } else {
        folderInWorkspace = false;
    }
    return folderInWorkspace;
}
