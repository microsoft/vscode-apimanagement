/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { cpUtils } from '../utils/cpUtils';
import { dotnetUtils } from '../utils/dotnetUtils';
import { ExtensionHelper } from '../utils/ExtensionHelper';
import { getDefaultWorkspacePath } from '../utils/fsUtil';

export async function setupWorkingFolder(this: IActionContext): Promise<void> {
    ext.outputChannel.appendLine(localize("folderInitialized", "Initialization started..."));
    ext.outputChannel.show();
    // make sure dotnet tools are installed.
    await dotnetUtils.validateDotnetInstalled(this);

    // check vscode csharp extension is installed.
    const extensionHelper = new ExtensionHelper();
    await extensionHelper.checkCsharpExtensionInstalled(this);

    const workingFolderPath = getDefaultWorkspacePath();

    // cleanup the directory, incase it was previously setup or used.
    await fse.emptyDir(workingFolderPath);

    // run dotnet new webapp to create a dummy empty asp.net webapp project to work with razor files.
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
        'add',
        'package',
        'Newtonsoft.Json');

    // run dotnet build atleast once to get the intellisense working in razor files.
    await cpUtils.executeCommand(
        ext.outputChannel,
        workingFolderPath,
        'dotnet',
        'build');

    ext.outputChannel.appendLine(localize("folderInitialized", "Initialization completed!"));
    ext.outputChannel.appendLine(localize("closePolicyFiles", "Please close and reopen any open policy files."));
    ext.outputChannel.show();
}
