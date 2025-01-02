/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IParsedError, parseError } from '@microsoft/vscode-azext-utils';
import { ext } from "../extensionVariables";

// tslint:disable: no-unsafe-any
export function errorUtil(responseBody: string): string {
    let msg: string = "";
    const errors = JSON.parse(responseBody);
    errors.error.details.forEach((element) => {
        msg = msg.concat(`Error: "${element.code}" - "${element.message}" \n`);
    });
    return msg;
}

// tslint:disable-next-line:no-any
export function processError(error: any, message: string) : string {
    ext.outputChannel.appendLine(error);
    try {
        const err : IParsedError = parseError(error);
        message = err.message;
        if (err.errorType.toLowerCase() === 'validationerror') {
            // tslint:disable-next-line: no-unsafe-any
            message = errorUtil(error.response.body);
        }
    } catch (e) {
        ext.outputChannel.appendLine("Could not parse error.");
    }

    ext.outputChannel.appendLine(message);
    ext.outputChannel.show();
    return message;
}
