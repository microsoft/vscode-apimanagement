/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { Context } from 'mocha';
import * as os from 'os';
import * as path from 'path';
import { ext, getRandomHexString } from '../extension.bundle';
import { parseError } from '@microsoft/vscode-azext-utils';
import { TestOutputChannel } from '@microsoft/vscode-azext-dev';

export let longRunningTestsEnabled: boolean;
export const testFolderPath: string = path.join(os.tmpdir(), `azureApiManagementTest${getRandomHexString()}`);

// Runs before all tests
suiteSetup(async function (this: Context): Promise<void> {
    this.timeout(120 * 1000);

    await fse.ensureDir(testFolderPath);

    //await vscode.commands.executeCommand('azureApiManagement.Refresh'); // activate the extension before tests begin
    ext.outputChannel = new TestOutputChannel();

    // tslint:disable-next-line:strict-boolean-expressions
    longRunningTestsEnabled = !/^(false|0)?$/i.test(process.env.ENABLE_LONG_RUNNING_TESTS || '');
});

suiteTeardown(async function (this: Context): Promise<void> {
    this.timeout(90 * 1000);
    try {
        await fse.remove(testFolderPath);
    } catch (error) {
        // Build machines fail pretty often with an EPERM error on Windows, but removing the temp test folder isn't worth failing the build
        console.warn(`Failed to delete test folder path: ${parseError(error).message}`);
    }
});
