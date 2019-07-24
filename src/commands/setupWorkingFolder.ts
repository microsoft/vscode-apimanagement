/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { cpUtils } from '../utils/cpUtils';
import { dotnetUtils } from '../utils/dotnetUtils';
import { getDefaultWorkspacePath } from '../utils/fsUtil';

export async function setupWorkingFolder(this: IActionContext): Promise<void> {
   const workingFolderPath = getDefaultWorkspacePath();

   // cleanup the directory, incase it was previously setup or used.
   await fse.emptyDir(workingFolderPath);

   await dotnetUtils.validateDotnetInstalled(this);

   await cpUtils.executeCommand(
       ext.outputChannel,
       workingFolderPath,
       'dotnet',
       'new',
       'web');

   // Copy the supporting files.
   await fse.copy(ext.context.asAbsolutePath(path.join('resources', 'projectFiles')), workingFolderPath, { overwrite: true, recursive: false });

   await cpUtils.executeCommand(
    ext.outputChannel,
    workingFolderPath,
    'dotnet',
    'build');
}
