/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { extensionName, showOpenWorkingFolderPromptConfigKey } from '../constants';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
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

export async function promptOpenWorkingFolder(): Promise<void> {
    const showPrompt: boolean | undefined = vscode.workspace.getConfiguration().get(showOpenWorkingFolderPromptConfigKey);
    if (showPrompt) {
        const dontAskAgain: vscode.MessageItem = { title: localize('dontAskAgain', "Don't Ask Again") };
        if (!workingFolderOpenedInWorkspace()) {
            const message: string = localize('openFolderInWorkspace', 'For better policy authoring experience open folder "{0}".', getDefaultWorkspacePath());
            const btn: vscode.MessageItem = { title: localize('openFolder', 'Open Folder') };
            // tslint:disable-next-line: no-floating-promises
            ext.ui.showWarningMessage(message, btn, dontAskAgain).then(async result => {
                if (result === btn) {
                    vscode.commands.executeCommand("azureApiManagement.openWorkingFolder");
                } else if (result === dontAskAgain) {
                    await vscode.workspace.getConfiguration().update(showOpenWorkingFolderPromptConfigKey, false, vscode.ConfigurationTarget.Global);
                }
            });
        } else {
            const workingFolderPath = getDefaultWorkspacePath();
            const projFileExists = await fse.pathExists(path.join(workingFolderPath, `${extensionName}.csproj`));
            if (!projFileExists) {
                const message: string = localize('setupWorkingFolder', 'Folder has not been initialized with required content to improve policy authoring experience.');
                const btn: vscode.MessageItem = { title: localize('initialize', 'Initialize') };
                // tslint:disable-next-line: no-floating-promises
                ext.ui.showWarningMessage(message, btn, dontAskAgain).then(async result => {
                    if (result === btn) {
                        vscode.commands.executeCommand("azureApiManagement.setupWorkingFolder");
                    } else if (result === dontAskAgain) {
                        await vscode.workspace.getConfiguration().update(showOpenWorkingFolderPromptConfigKey, false, vscode.ConfigurationTarget.Global);
                    }
                });
            }
        }
    }
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
