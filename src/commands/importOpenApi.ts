/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import { OpenDialogOptions, ProgressLocation, Uri, window, workspace } from "vscode";
import { ApisTreeItem } from "../explorer/ApisTreeItem";
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { IOpenApiImportObject } from "../openApi/OpenApiImportObject";
import { OpenApiParser } from '../openApi/OpenApiParser';
import { processError } from '../utils/errorUtil';
import { requestUtil } from '../utils/requestUtil';

// tslint:disable: no-any
export async function importOpenApi(node?: ApisTreeItem, importUsingLink: boolean = false): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
        node = serviceNode.apisTreeItem;
    }

    let documentString: string | undefined;
    if (!importUsingLink) {
        const uris = await askDocument();
        const uri = uris[0];
        const fileContent = await fse.readFile(uri.fsPath);
        documentString = fileContent.toString();
    } else {
        const openApiLink = await askLink();
        documentString = await requestUtil(openApiLink);
    }

    if (documentString !== undefined && documentString.trim() !== "") {
        const documentJson = JSON.parse(documentString);
        const document = await parseDocument(documentJson);
        const apiName = await askApiName();
        window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: localize("importingApi", `Importing API '${apiName}' to API Management service ${node.root.serviceName} ...`),
                cancellable: false
            },
            // tslint:disable-next-line:no-non-null-assertion
            async () => { return node!.createChild({ apiName: apiName, document: document }); }
        ).then(async () => {
            // tslint:disable-next-line:no-non-null-assertion
            await node!.refresh();
            window.showInformationMessage(localize("importedApi", `Imported API '${apiName}' to API Management succesfully.`));
        });
    }
}

async function askApiName() : Promise<string> {
    const apiNamePrompt: string = localize('apiNamePrompt', 'Enter API Name.');
    return (await ext.ui.showInputBox({
        prompt: apiNamePrompt,
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return validateApiName(value);
        }
    })).trim();
}

async function askDocument(): Promise<Uri[]> {
    const openDialogOptions: OpenDialogOptions = {
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        openLabel: "Import",
        filters: {
            JSON: ["json"]
        }
    };
    const rootPath = workspace.rootPath;
    if (rootPath) {
        openDialogOptions.defaultUri = Uri.file(rootPath);
    }
    return await ext.ui.showOpenDialog(openDialogOptions);
}

async function askLink() : Promise<string> {
    const promptStr: string = localize('apiLinkPrompt', 'Specify a OpenAPI 2.0 or 3.0 link.');
    return (await ext.ui.showInputBox({
        prompt: promptStr,
        placeHolder: 'https://',
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            const regexp = /http(s?):\/\/[\d\w][\d\w]*(\.[\d\w][\d\w-]*)*(:\d+)?(\/[\d\w-\.\?,'/\\\+&amp;=:%\$#_]*)?/;
            const isUrlValid = regexp.test(value);
            if (!isUrlValid) {
                return localize("invalidOpenApiLink", "Provide a valid link. example - https://petstore.swagger.io/v2/swagger.json");
            } else {
                return undefined;
            }
        }
    })).trim();
}

// tslint:disable: no-unsafe-any
async function parseDocument(documentJson: any): Promise<IOpenApiImportObject> {
    try {
        return await new OpenApiParser().parse(documentJson);
    } catch (error) {
       throw new Error(processError(error, localize("openApiJsonParseError", "Could not parse the provided OpenAPI document.")));
    }
}

function validateApiName(apiName: string): string | undefined {
    if (apiName.length > 256) {
        return localize("apiNameMaxLength", 'API name cannot be more than 256 characters long.');
    }
    if (apiName.match(/^[^*#&+:<>?]+$/) === null) {
        return localize("apiNameMaxLength", 'Invalid API Name.');
    }

    return undefined;
}
