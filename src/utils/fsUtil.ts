/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from "crypto";
import * as fse from 'fs-extra';
import * as path from 'path';
import { extensionName, sessionFolderKey  } from '../constants';
import { ext } from '../extensionVariables';

export async function createTemporaryFile(fileName: string): Promise<string> {
    // The extension globalStoragePath is a wellknown for vscode and will cleanup when extension gets uninstalled.
    const defaultWorkspacePath = path.join(ext.context.globalStoragePath, extensionName);
    await fse.ensureDir(defaultWorkspacePath);

    // Every vscode sessions will get a unique folder to works with the files
    // This folder will be deleted post vscode session.
    const sessionFolder = getSessionWorkingFolderName();
    const filePath: string = path.join(defaultWorkspacePath, sessionFolder, fileName);
    await fse.ensureFile(filePath);
    return filePath;
}

export function getSessionWorkingFolderName() : string {
    let sessionFolderName = ext.context.globalState.get(sessionFolderKey);
// tslint:disable-next-line: strict-boolean-expressions
    if (!sessionFolderName) {
        sessionFolderName = getRandomHexString();
        ext.outputChannel.appendLine(`Session working folder:${sessionFolderName}`);
        ext.context.globalState.update(sessionFolderKey, sessionFolderName);
    }

    return <string>sessionFolderName;
}

export function getRandomHexString(length: number = 10): string {
    const buffer: Buffer = crypto.randomBytes(Math.ceil(length / 2));
    return buffer.toString('hex').slice(0, length);
}

export function getDefaultWorkspacePath(): string {
    return path.join(ext.context.globalStoragePath, extensionName);
}
