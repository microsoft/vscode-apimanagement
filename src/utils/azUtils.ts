/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { DialogResponses, IAzExtOutputChannel } from "../../extension.bundle";
import { localize } from "../localize";
import { cpUtils } from "./cpUtils";
import { openUrl } from "./openUrl";

export namespace azUtils {
    export async function isAzInstalled(): Promise<boolean> {
        try {
            await cpUtils.executeCommand(undefined, undefined, 'az', '--version');
            return true;
        } catch (error) {
            return false;
        }
    }

    export async function checkAzInstalled(): Promise<void> {
        if (!await isAzInstalled()) {
            const message: string = localize('azNotInstalled', 'You must have the AZ CLI installed to perform this operation.');

            vscode.window.showErrorMessage(message, DialogResponses.learnMore).then(async (result) => {
                if (result === DialogResponses.learnMore) {
                    await openUrl('https://docs.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest');
                }
            });

            throw new Error(message);
        }
    }

    export async function setSubscription(subscriptionId: string, outputChannel: IAzExtOutputChannel): Promise<void> {

        await checkAzInstalled();

        // Assume that the user has already logged in - we can always log them in if this fails
        const result = await cpUtils.tryExecuteCommand(
            outputChannel,
            undefined,
            'az',
            'account',
            'set',
            '--subscription',
            subscriptionId
        );

        if (result.code !== 0) {
            await cpUtils.executeCommand(
                outputChannel,
                undefined,
                'az',
                'login'
            );

            await cpUtils.executeCommand(
                outputChannel,
                undefined,
                'az',
                'account',
                'set',
                '--subscription',
                subscriptionId
            );
        }
    }
}
