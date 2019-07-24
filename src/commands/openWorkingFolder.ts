/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';
import { extensionName } from '../constants';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { getDefaultWorkspacePath } from '../utils/fsUtil';
import { workingFolderOpenedInWorkspace } from '../utils/vscodeUtils';

export async function openWorkingFolder(): Promise<void> {
   openFolderInWorkspace();

   const workingFolderPath = getDefaultWorkspacePath();
   const projFileExists = await fse.pathExists(path.join(workingFolderPath, `${extensionName}.csproj`));

   if (!projFileExists) {
    const message: string = localize('setupWorkingFolder', 'Folder has not been initialized with required content.');
    const btn: vscode.MessageItem = { title: localize('initialize', 'Initialize') };
    // tslint:disable-next-line: no-floating-promises
    ext.ui.showWarningMessage(message, btn).then(async result => {
        if (result === btn) {
            vscode.commands.executeCommand("azureApiManagement.setupWorkingFolder");
        }
    });
}
}

export function openFolderInWorkspace(): void {
    const folderPath = getDefaultWorkspacePath();
    if (!workingFolderOpenedInWorkspace()) {
        vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(folderPath));
    } else {
        ext.outputChannel.appendLine(localize("folderAlreadyInWorkspace", "Folder '{0}' already open in workspace", folderPath));
        ext.outputChannel.show();
    }
}
