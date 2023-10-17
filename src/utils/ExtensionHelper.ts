/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { DialogResponses, IActionContext } from 'vscode-azureextensionui';
import { localize } from '../localize';
import { IFileDownloader } from './IFileDownloader';
import { openUrl } from './openUrl';

export class ExtensionHelper {
    private _fileDownloaderExtension: vscode.Extension<IFileDownloader> | undefined;

    public async checkCsharpExtensionInstalled(actionContext: IActionContext): Promise<void> {
        const csharpExtension = vscode.extensions.getExtension("ms-dotnettools.csharp") || vscode.extensions.getExtension("ms-vscode.csharp");
        if (!csharpExtension) {
            const message: string = localize('csharpExtensionNotInstalled', 'You must have the VSCode CSharp extension installed to improve policy authoring experience.');

            if (!actionContext.errorHandling.suppressDisplay) {
                // don't wait
                vscode.window.showErrorMessage(message, DialogResponses.learnMore).then(async (result) => {
                    if (result === DialogResponses.learnMore) {
                        await openUrl('https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp');
                    }
                });
                actionContext.errorHandling.suppressDisplay = true;
            }

            throw new Error(message);
        }
    }

    public async getFileDownloaderApi(): Promise<IFileDownloader> {
        if (this._fileDownloaderExtension == null) {
            const extension = vscode.extensions.getExtension(`mindaro-dev.file-downloader`);
            if (extension == null) {
                throw new Error(`Failed to get File Downloader VS Code extension.`);
            }
            this._fileDownloaderExtension = extension;
        }
        if (!this._fileDownloaderExtension.isActive) {
            await this._fileDownloaderExtension.activate();
        }
        return this._fileDownloaderExtension.exports;
    }
}
