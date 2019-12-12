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

export async function extractSingleApi(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    const uris = await askDocument();
    const uri = uris[0];
    const templatesFolder = uri.fsPath.concat("\\templates");
    if (!fse.existsSync(templatesFolder)) {
        await fse.mkdir(templatesFolder);
    } else {
        await fse.emptyDir(templatesFolder);
    }

    const sourceApimName = node.root.serviceName;
    const resourceGroup = node.root.resourceGroupName;
    const apiName = node.apiContract.name;

    var singleApiJson = {
        "sourceApimName": sourceApimName,
        "destinationApimName": "",
        "resourceGroup": resourceGroup,
        "fileFolder": templatesFolder,
        "apiName": apiName,
        "linkedTemplatesBaseUrl": "",
        "linkedTemplatesUrlQueryString": "",
        "policyXMLBaseUrl": ""
    }

    const filePathSingleApi = uri.fsPath.concat("/extractor.json");
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

    const uris = await askDocument();
    const uri = uris[0];
    const templatesFolder = uri.fsPath.concat("\\templates");
    if (!fse.existsSync(templatesFolder)) {
        await fse.mkdir(templatesFolder);
    } else {
        await fse.emptyDir(templatesFolder);
    }

    const fullId = node.id == undefined ? "" : node.id;
    var apiParams = fullId.split("/");

    // generate split templates
    var splitApisJson = {
        "sourceApimName": apiParams[8],
        "destinationApimName": "",
        "resourceGroup": apiParams[4],
        "fileFolder": templatesFolder,
        "splitAPIs": "true",
        "linkedTemplatesBaseUrl": "",
        "linkedTemplatesUrlQueryString": "",
        "policyXMLBaseUrl": ""
    };

    const filePathSplit = uri.fsPath.concat("/extractor.json");
    fse.writeFile(filePathSplit, JSON.stringify(splitApisJson));

    //generate linked templates
    const masterFolderPath = templatesFolder.concat("\\linkedFolder");

    var linkedApiJson = {
        "sourceApimName": apiParams[8],
        "destinationApimName": "",
        "resourceGroup": apiParams[4],
        "fileFolder": masterFolderPath,
        "linkedTemplatesBaseUrl": "",
        "linkedTemplatesUrlQueryString": "",
        "policyXMLBaseUrl": ""
    };

    const filePathLinked = uri.fsPath.concat("/extractorMaster.json");
    fse.writeFile(filePathLinked, JSON.stringify(linkedApiJson));
    
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("Extract Apis", `Extract all APIs from service '${apiParams[8]}' to '${templatesFolder}'`),
            cancellable: false
        },
        async () => {
            await runExtractor(filePathLinked);
            await runExtractor(filePathSplit);
        }
    ).then(
        () => {
            window.showInformationMessage(localize("Extract Apis", `Extract all APIs from '${apiParams[8]}' completed!`));
        });
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