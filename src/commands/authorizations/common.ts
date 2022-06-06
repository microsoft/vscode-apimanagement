/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITokenStoreGrantTypeParameterContract, ITokenStoreGrantTypeParameterDefinitionContract } from "../../azure/apim/contracts";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";

export async function askAuthorizationProviderParameterValues(grant: ITokenStoreGrantTypeParameterContract) : Promise<IParameterValues> {
    const parameterValues: IParameterValues = {};
    // tslint:disable-next-line:forin no-for-in
    for (const parameter in grant) {
            const parameterUIMetadata = <ITokenStoreGrantTypeParameterDefinitionContract>grant[parameter];
            if (parameterUIMetadata.uidefinition.atAuthorizationProviderLevel !== "HIDDEN") {
                parameterValues[parameter] = await askParam(
                    parameterUIMetadata,
                    parameterUIMetadata.uidefinition.atAuthorizationProviderLevel === "REQUIRED" );
            }
        }

    return parameterValues;
}

export async function askAuthorizationParameterValues(grant: ITokenStoreGrantTypeParameterContract) : Promise<IParameterValues> {
    const parameterValues: IParameterValues = {};
    // tslint:disable-next-line:forin no-for-in
    for (const parameter in grant) {
            const parameterUIMetadata = <ITokenStoreGrantTypeParameterDefinitionContract>grant[parameter];
            if (parameterUIMetadata.uidefinition.atAuthorizationProviderLevel === "HIDDEN") {
                parameterValues[parameter] = await askParam(
                    parameterUIMetadata,
                    true);
            }
        }

    return parameterValues;
}

async function askParam(parameterUIMetadata: ITokenStoreGrantTypeParameterDefinitionContract, isRequired: boolean) : Promise<string> {
    return await ext.ui.showInputBox({
        placeHolder: localize('parameterDisplayName', `Enter ${parameterUIMetadata.displayName} ...`),
        prompt: localize('parameterDescription', `${parameterUIMetadata.description}`),
        value: parameterUIMetadata.default,
        password: parameterUIMetadata.type === "securestring",
        validateInput: async (value: string | undefined): Promise<string | undefined> => {
            value = value ? value.trim() : '';

            if (isRequired && value.length < 1) {
                return localize("parameterRequired", `${parameterUIMetadata.displayName} is required.`);
            }

            return undefined;
        }
    });
}

export async function askId(prompt: string, errorMessage: string, defaultValue: string = ''): Promise<string> {
    const idPrompt: string = localize('idPrompt', prompt);
    return (await ext.ui.showInputBox({
        prompt: idPrompt,
        value: defaultValue,
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return validateId(value, errorMessage);
        }
    })).trim();
}

function validateId(id: string, errorMessage: string): string | undefined {
    const test = "^[\w]+$)|(^[\w][\w\-]+[\w]$";
    if (id.match(test) === null) {
        return localize("idInvalid", errorMessage);
    }

    return undefined;
}

export interface IParameterValues {
    [key: string]: string;
}
