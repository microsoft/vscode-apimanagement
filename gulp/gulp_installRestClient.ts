/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

// Tests expect the extension to be installed.
// tslint:disable-next-line: promise-function-async
export function gulp_installRestClient(): Promise<void> {
    const version: string = '0.21.3';
    const extensionPath: string = path.join(os.homedir(), `.vscode/extensions/humao.rest-client-${version}`);
    fse.ensureDirSync(extensionPath);
    return Promise.resolve();
}
