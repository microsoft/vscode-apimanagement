import * as vscode from 'vscode';
import { DialogResponses } from "../../extension.bundle";
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
}
