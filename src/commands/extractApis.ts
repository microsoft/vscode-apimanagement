/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { OpenDialogOptions, Uri, workspace, window, ProgressLocation } from "vscode";
import { ApiTreeItem } from '../explorer/ApiTreeItem';
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { cpUtils } from '../utils/cpUtils';
import { getDefaultWorkspacePath } from '../utils/fsUtil';
import { AzureTreeItem } from 'vscode-azureextensionui';
import * as Constants from '../constants';

export async function extractSingleApi(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }
    const uris = await askDocument(true);
    const templatesFolder = await createTemplatesFolder(uris);
    const sourceApimName = node.root.serviceName;
    const resourceGroup = node.root.resourceGroupName;
    const apiName = node.apiContract.name == null ? "" : node.apiContract.name;

    var singleApiJson = genSingleApiJsonObj(sourceApimName, resourceGroup, templatesFolder, apiName);

    const filePathSingleApi = uris[0].fsPath.concat("/", apiName, ".json");
    fse.writeFile(filePathSingleApi, JSON.stringify(singleApiJson));
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("Extract Api", `Extract API '${apiName}' to '${templatesFolder}'`),
            cancellable: false
        },
        async () => { await runExtractor(filePathSingleApi); }
    ).then(
        () => {
            window.showInformationMessage(localize("Extract Api", `Extract Api '${apiName}' completed!`));
        });
}

export async function extractApis(node?: AzureTreeItem): Promise<void> {
    if (!node) {
        node = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
    }

    const uris = await askDocument(true);
    const templatesFolder = await createTemplatesFolder(uris);
    const fullId = node.id == undefined ? "" : node.id;
    var apiParams = fullId.split("/");

    //generate linked templates

    var linkedApiJson = genLinkedApisJsonObj(apiParams[8], apiParams[4], templatesFolder);

    const filePathLinked = uris[0].fsPath.concat(Constants.extractorMasterJsonFile);
    fse.writeFile(filePathLinked, JSON.stringify(linkedApiJson));

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("Extract Apis", `Extract all APIs from service '${apiParams[8]}' to '${templatesFolder}'`),
            cancellable: false
        },
        async () => {
            await runExtractor(filePathLinked);
        }
    ).then(
        () => {
            window.showInformationMessage(localize("Extract Apis", `Extract all APIs from '${apiParams[8]}' completed!`));
        });
}

async function createTemplatesFolder(uris: Uri[]): Promise<string> {
    const uri = uris[0];
    const templatesFolder = uri.fsPath.concat(Constants.templatesFolder);
    if (!fse.existsSync(templatesFolder)) {
        await fse.mkdir(templatesFolder);
    } else {
        await fse.emptyDir(templatesFolder);
    }
    return templatesFolder;
}

async function runExtractor(filePath: string) {
    const workingFolderPath = getDefaultWorkspacePath();
    await fse.copy(ext.context.asAbsolutePath(path.join('resources', 'devops')), workingFolderPath, { overwrite: true, recursive: false });

    ext.outputChannel.show();

    await cpUtils.executeCommand(
        ext.outputChannel,
        workingFolderPath,
        'apimtemplate',
        'extract',
        '--extractorConfig',
        filePath
    );
}

async function askDocument(isFolder: boolean): Promise<Uri[]> {
    if (isFolder) {
        window.showInformationMessage(localize("Extract Api", `Please specify the folder for generating templates.`));
    } else {
        window.showInformationMessage(localize("Extract Api with config file", `Please specify the config file to use.`));
    }
    const openDialogOptions: OpenDialogOptions = {
        canSelectFiles: !isFolder,
        canSelectFolders: isFolder,
        canSelectMany: false,
        openLabel: "Extract",
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

function genSingleApiJsonObj(sourceApimName: string, resourceGroup: string, templatesFolder: string, apiName: string) {
    return {
        "sourceApimName": sourceApimName,
        "destinationApimName": "",
        "resourceGroup": resourceGroup,
        "fileFolder": templatesFolder,
        "apiName": apiName,
        "linkedTemplatesBaseUrl": "",
        "linkedTemplatesUrlQueryString": "",
        "policyXMLBaseUrl": ""
    };
}

function genLinkedApisJsonObj(sourceApimName: string, resourceGroup: string, masterFolderPath: string) {
    return {
        "sourceApimName": sourceApimName,
        "destinationApimName": "",
        "resourceGroup": resourceGroup,
        "fileFolder": masterFolderPath,
        "linkedTemplatesBaseUrl": "",
        "linkedTemplatesUrlQueryString": "",
        "policyXMLBaseUrl": ""
    };
}