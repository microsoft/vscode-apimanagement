/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DialogResponses, IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from "../localize";
import { cpUtils } from "./cpUtils";
import { openUrl } from './openUrl';

export namespace dotnetUtils {
    export async function isDotnetInstalled(): Promise<boolean> {
        try {
            await cpUtils.executeCommand(undefined, undefined, 'dotnet', '--version');
            return true;
        } catch (error) {
            return false;
        }
    }

    export async function validateDotnetInstalled(actionContext?: IActionContext, minVersion: string = "2.1"): Promise<void> {
        if (!await isDotnetInstalled() || !await checkDotnetVersionInstalled(minVersion)) {
            const message: string = localize('dotnetNotInstalled', 'You must have the .NET CLI {0} or older installed to perform this operation.', minVersion);

            if (!actionContext || !actionContext.errorHandling.suppressDisplay) {
                // don't wait
                vscode.window.showErrorMessage(message, DialogResponses.learnMore).then(async (result) => {
                    if (result === DialogResponses.learnMore) {
                        await openUrl('https://aka.ms/AA4ac70');
                    }
                });
                if (actionContext) {
                    actionContext.errorHandling.suppressDisplay = true;
                }
            }

            throw new Error(message);
        }
    }

    function compareVersion(version1: string, version2: string): number {
        const v1 = version1.split('.').map(parseInt);
        const v2 = version2.split('.').map(parseInt);
        for (let i = 0; i < Math.min(v1.length, v2.length); i++) {
            if (v1[i] > v2[i]) { return 1; }
            if (v1[i] < v2[i]) { return -1; }
        }
        return v1.length === v2.length ? 0 : (v1.length < v2.length ? -1 : 1);
    }

    async function checkDotnetVersionInstalled(minVersion: string): Promise<boolean> {
        try {
            const response = await cpUtils.executeCommand(undefined, undefined, 'dotnet', '--list-runtimes');
            const versions = response.split(/\r?\n/);
            for (const version of versions) {
                const versionNumber = version.split(' ')[1];
                if (compareVersion(versionNumber, minVersion) >= 0) {
                    return true;
                }
            }
        } catch (error) {
            return false;
        }
        return false;
    }
}
