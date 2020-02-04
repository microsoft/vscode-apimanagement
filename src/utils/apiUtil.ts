/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Constants from "../constants";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export namespace apiUtil {
    export async function askApiName(defaultName?: string): Promise<string> {
        const apiNamePrompt: string = localize('apiNamePrompt', 'Enter API Name.');
        return (await ext.ui.showInputBox({
            prompt: apiNamePrompt,
            value: defaultName,
            validateInput: async (value: string | undefined): Promise<string | undefined> => {
                value = value ? value.trim() : '';
                return validateApiName(value);
            }
        })).trim();
    }

    export function genApiId(apiName: string): string {
        const identifier = displayNameToIdentifier(apiName);
        return `/apis/${identifier}`;
    }

    export function validateApiName(apiName: string): string | undefined {
        if (apiName.length > Constants.maxApiNameLength) {
            return localize("apiNameMaxLength", `API name cannot be more than ${Constants.maxApiNameLength} characters long.`);
        }
        if (apiName.match(/^[^*#&+:<>?]+$/) === null) {
            return localize("apiNameInvalid", 'Invalid API Name.');
        }

        return undefined;
    }

    function removeAccents(str: string): string {
        const accents = "ÀÁÂÃÄÅàáâãäåßÒÓÔÕÕÖØòóôõöøĎďDŽdžÈÉÊËèéêëðÇçČčÐÌÍÎÏìíîïÙÚÛÜùúûüĽĹľĺÑŇňñŔŕŠšŤťŸÝÿýŽž";
        const accentsOut = "AAAAAAaaaaaasOOOOOOOooooooDdDZdzEEEEeeeeeCcCcDIIIIiiiiUUUUuuuuLLllNNnnRrSsTtYYyyZz";
        const chars = str.split("");

        chars.forEach((letter, index) => {
            const i = accents.indexOf(letter);
            if (i !== -1) {
                chars[index] = accentsOut[i];
            }
        });

        return chars.join("");
    }

    export function displayNameToIdentifier(value: string): string {
        const invalidIdCharsRegExp = new RegExp(Constants.invalidIdCharRegEx, "ig");
        let identifier = value && value.replace(invalidIdCharsRegExp, "-").trim().replace(/-+/g, "-").substr(0, Constants.maxApiNameLength).replace(/(^-)|(-$)/g, "").toLowerCase();
        identifier = removeAccents(identifier);
        return identifier;
    }
}
