/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { advancedPolicyAuthoringExperienceConfigKey, extensionName } from '../constants';
import { localize } from '../localize';
import { getDefaultWorkspacePath } from './fsUtil';
import { IActionContext } from '@microsoft/vscode-azext-utils';

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

export async function promptOpenWorkingFolder(context: IActionContext): Promise<void> {
    const showPrompt: boolean | undefined = vscode.workspace.getConfiguration().get(advancedPolicyAuthoringExperienceConfigKey);
    if (showPrompt) {
        const dontAskAgain: vscode.MessageItem = { title: localize('dontAskAgain', "Don't Ask Again") };
        if (!workingFolderOpenedInWorkspace()) {
            if (!await workingFolderInitialized()) {
                const message: string = localize('initializeAndOpenFolderInWorkspace', 'For advanced policy authoring experience, initialize and open extension workspace folder "{0}".', getDefaultWorkspacePath());
                const btn: vscode.MessageItem = { title: localize('initializeAndOpenFolder', 'Initialize and Open') };
                // tslint:disable-next-line: no-floating-promises
                context.ui.showWarningMessage(message, btn, dontAskAgain).then(async result => {
                    if (result === btn) {
                        // Initialize and Open folder
                        vscode.commands.executeCommand("azureApiManagement.initializeExtensionWorkspaceFolder")
                        .then(() => {
                            vscode.commands.executeCommand("azureApiManagement.openExtensionWorkspaceFolder");
                        });
                    } else if (result === dontAskAgain) {
                        await vscode.workspace.getConfiguration().update(advancedPolicyAuthoringExperienceConfigKey, false, vscode.ConfigurationTarget.Global);
                    }
                });
            } else {
                const message: string = localize('openFolderInWorkspace', 'For advanved policy authoring experience, open extension workspace folder "{0}".', getDefaultWorkspacePath());
                const btn: vscode.MessageItem = { title: localize('openFolder', 'Open Folder') };
                // tslint:disable-next-line: no-floating-promises
                context.ui.showWarningMessage(message, btn, dontAskAgain).then(async result => {
                    if (result === btn) {
                        vscode.commands.executeCommand("azureApiManagement.openExtensionWorkspaceFolder");
                    } else if (result === dontAskAgain) {
                        await vscode.workspace.getConfiguration().update(advancedPolicyAuthoringExperienceConfigKey, false, vscode.ConfigurationTarget.Global);
                    }
                });
            }
        } else {
            if (!await workingFolderInitialized()) {
                const message: string = localize('setupWorkingFolder', 'For advanved policy authoring experience, initialize extension workspace folder "{0}".', getDefaultWorkspacePath());
                const btn: vscode.MessageItem = { title: localize('initialize', 'Initialize') };
                // tslint:disable-next-line: no-floating-promises
                context.ui.showWarningMessage(message, btn, dontAskAgain).then(async result => {
                    if (result === btn) {
                        vscode.commands.executeCommand("azureApiManagement.initializeExtensionWorkspaceFolder");
                    } else if (result === dontAskAgain) {
                        await vscode.workspace.getConfiguration().update(advancedPolicyAuthoringExperienceConfigKey, false, vscode.ConfigurationTarget.Global);
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

async function workingFolderInitialized() : Promise<boolean> {
    const workingFolderPath = getDefaultWorkspacePath();
    return await fse.pathExists(path.join(workingFolderPath, `${extensionName}.csproj`));
}
