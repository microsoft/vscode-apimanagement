/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { OpenDialogOptions, Uri, workspace } from "vscode";
import { ApisTreeItem } from "../explorer/ApisTreeItem";
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from '../extensionVariables';
//import { localize } from '../localize';
import { cpUtils } from '../utils/cpUtils';
import { getDefaultWorkspacePath } from '../utils/fsUtil';


export async function extractApis(node?: ApisTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
        node = serviceNode.apisTreeItem;
    }

    const uris = await askDocument();
    const uri = uris[0];
    const templatesFolder = uri.fsPath.concat("\\templates");
    if (!fse.existsSync(templatesFolder)) {
        await fse.mkdir(templatesFolder);
    } else {
        await fse.emptyDir(templatesFolder);
    }

    // const destinationApiName = await askDestinationApimName();
    // const linkedBaseUrl = await askParams("linkedBaseUrl");
    // const policyUrl = await askParams("policyUrl");
    // const queryString = await askParams("queryString");

    const destinationApiName = "";
    const linkedBaseUrl = "";
    const policyUrl = "";
    const queryString = "";
    const sourceApimName = node.root.serviceName;
    const resourceGroup = node.root.resourceGroupName;

    // generate split templates
    var fileContent = {
        "sourceApimName": sourceApimName,
        "destinationApimName": destinationApiName,
        "resourceGroup": resourceGroup,
        "fileFolder": templatesFolder,
        "splitAPIs": "true",
        "linkedTemplatesBaseUrl": linkedBaseUrl,
        "linkedTemplatesUrlQueryString": queryString,
        "policyXMLBaseUrl": policyUrl
    };

    const filePathSplit = uri.fsPath.concat("/extractor.json");
    fse.writeFile(filePathSplit, JSON.stringify(fileContent));
    runExtractor(filePathSplit);

    //generate linked templates
    const masterFolderPath = templatesFolder.concat("\\linkedFolder");

    var fileContentMaster = {
        "sourceApimName": sourceApimName,
        "destinationApimName": destinationApiName,
        "resourceGroup": resourceGroup,
        "fileFolder": masterFolderPath,
        "linkedTemplatesBaseUrl": linkedBaseUrl,
        "linkedTemplatesUrlQueryString": queryString,
        "policyXMLBaseUrl": policyUrl
    };

    const filePathLinked = uri.fsPath.concat("/extractorMaster.json");
    fse.writeFile(filePathLinked, JSON.stringify(fileContentMaster));
    runExtractor(filePathLinked);
}

async function runExtractor(filePath: string) {
    const workingFolderPath = getDefaultWorkspacePath();
    await fse.copy(ext.context.asAbsolutePath(path.join('resources', 'devops')), workingFolderPath, { overwrite: true, recursive: false });

    await cpUtils.executeCommand(
        ext.outputChannel,
        workingFolderPath,
        'apimtemplate.exe',
        'extract',
        '--extractorConfig',
        filePath
    );
}

async function askDocument(): Promise<Uri[]> {
    const openDialogOptions: OpenDialogOptions = {
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Folder to put templates",
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

// async function askParams(notification: string): Promise<string> {
//     const apiNamePrompt: string = localize('apiNamePrompt', notification);
//     return (await ext.ui.showInputBox({
//         prompt: apiNamePrompt,
//         validateInput: async (value: string): Promise<string | undefined> => {
//             value = value ? value.trim() : '';
//             return undefined;
//         }
//     })).trim();
// }

// async function askDestinationApimName(): Promise<string> {
//     const apiNamePrompt: string = localize('apiNamePrompt', 'Enter destination API management service name.');
//     return (await ext.ui.showInputBox({
//         prompt: apiNamePrompt,
//         validateInput: async (value: string): Promise<string | undefined> => {
//             value = value ? value.trim() : '';
//             return validateApimname(value);
//         }
//     })).trim();
// }

// function validateApimname(apimName: string): string | undefined {
//     if (apimName.length > 256) {
//         return localize("apimNameMaxLength", 'Apim name cannot be more than 256 characters long.');
//     }
//     if (apimName.match(/^[^*#&+:<>?]+$/) === null) {
//         return localize("apimNameInvalid", 'Invalid Apim Name.');
//     }

//     return undefined;
// }