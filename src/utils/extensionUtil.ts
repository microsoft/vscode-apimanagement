/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { DialogResponses, IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../localize';
import { openUrl } from '../utils/openUrl';

// tslint:disable-next-line:export-name
export function checkCsharpExtensionInstalled(actionContext: IActionContext): void {
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
