/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { getDefaultWorkspacePath } from '../utils/fsUtil';
import { workingFolderOpenedInWorkspace } from '../utils/vscodeUtils';

export async function openWorkingFolder(): Promise<void> {
    const folderPath = getDefaultWorkspacePath();
    if (!workingFolderOpenedInWorkspace()) {
        vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(folderPath));
    } else {
        ext.outputChannel.appendLine(localize("folderAlreadyInWorkspace", "Folder '{0}' already open in workspace", folderPath));
        ext.outputChannel.show();
    }
}
