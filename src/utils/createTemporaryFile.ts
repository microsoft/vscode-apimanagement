/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';

export async function createTemporaryFile(fileName: string): Promise<string> {
    const filePath: string = path.join(os.tmpdir(), 'vscode-azureapim', fileName);
    await fse.ensureFile(filePath);
    return filePath;
}
