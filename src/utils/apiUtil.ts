/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperationContract, ApiContract, Protocol, ApiCreateOrUpdateParameter } from "@azure/arm-apimanagement";
import { window } from "vscode";
import { AzExtParentTreeItem, DialogResponses, IParsedError, parseError, UserCancelledError, IActionContext } from "@microsoft/vscode-azext-utils";
import { IOpenApiImportObject} from "../../extension.bundle";
import * as Constants from "../constants";
import { IServiceTreeRoot } from "../explorer/IServiceTreeRoot";
import { localize } from "../localize";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { ITreeItemWithRoot } from "../explorer/ITreeItemWithRoot";

export namespace apiUtil {
    export async function askApiName(context: IActionContext, defaultName?: string): Promise<string> {
        const apiNamePrompt: string = localize('apiNamePrompt', 'Enter API Name.');
        return (await context.ui.showInputBox({
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

    export async function createOrUpdateApiWithSwaggerObject(node: AzExtParentTreeItem & ITreeItemWithRoot<IServiceTreeRoot>, apiName: string, document: IOpenApiImportObject): Promise<ApiContract> {
        document.info.title = apiName;

        await checkApiExist(node, apiName);

        // import doesn't specify format
        const openApiImportPayload: ApiCreateOrUpdateParameter = { displayName: apiName, path: apiName, format: undefined, value: '' };
        if (document.schemes === undefined) {
            openApiImportPayload.protocols = ["https"];
        } else {
            const protocols: Protocol[] = [];
            if (document.schemes.indexOf("http") !== -1) {
                protocols.push("http");
            }
            if (document.schemes.indexOf("https") !== -1) {
                protocols.push("https");
            }
            openApiImportPayload.protocols = protocols;
        }
        openApiImportPayload.format = document.importFormat;
        openApiImportPayload.value = JSON.stringify(document.sourceDocument);

        const options = { ifMatch: "*" };
        return await node.root.client.api.beginCreateOrUpdateAndWait(node.root.resourceGroupName, node.root.serviceName, apiName, openApiImportPayload, options);
    }

    export async function checkApiExist(node: AzExtParentTreeItem & ITreeItemWithRoot<IServiceTreeRoot>, apiName: string): Promise<void> {
        let apiExists: boolean = true;
        try {
            await node.root.client.api.get(node.root.resourceGroupName, node.root.serviceName, apiName);
        } catch (error) {
            const err: IParsedError = parseError(error);
            if (err.errorType.toLocaleLowerCase() === 'notfound' || err.errorType.toLowerCase() === 'resourcenotfound') {
                apiExists = false;
            }
        }
        if (apiExists) {
            const overwriteFlag = await window.showWarningMessage(localize("apiAlreadyExists", `API "${apiName}" already exists. Import will trigger an 'Override' of exisiting API. Do you want to continue?`), { modal: true }, DialogResponses.yes, DialogResponses.cancel);
            if (overwriteFlag !== DialogResponses.yes) {
                throw new UserCancelledError();
            }
        }
    }

    export async function getAllOperationsForApi(root: IServiceTreeRoot, apiId: string): Promise<OperationContract[]> {
        let operations: OperationContract[] = await uiUtils.listAllIterator(root.client.apiOperation.listByApi(root.resourceGroupName, root.serviceName, apiId));
        return operations;
    }

    export function isNotApiRevision(api: ApiContract): boolean {
        return api.isCurrent !== undefined && api.isCurrent === true;
    }
}
