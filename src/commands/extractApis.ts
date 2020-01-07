/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { OpenDialogOptions, ProgressLocation, Uri, window, workspace } from "vscode";
import { AzureTreeItem } from 'vscode-azureextensionui';
import * as Constants from '../constants';
import { ApiTreeItem } from '../explorer/ApiTreeItem';
import { ext } from '../extensionVariables';
import { LinkedApisJsonObject } from "../extractApi/LinkedApisJsonObject";
import { SingleApiJsonObject } from "../extractApi/SingleApiJsonObject";
import { localize } from '../localize';
import { cpUtils } from '../utils/cpUtils';
import { getDefaultWorkspacePath } from '../utils/fsUtil';

export async function extractApis(node: AzureTreeItem | ApiTreeItem): Promise<void> {
    const uris = await askFolder();
    const templatesFolder = await createTemplatesFolder(uris);
    let configFile: string = "";
    let noticeContent: string = "";

    if (node instanceof ApiTreeItem) {
        const apiNode: ApiTreeItem = node;

        const sourceApimName = apiNode.root.serviceName;
        const resourceGroup = apiNode.root.resourceGroupName;
        const apiName = apiNode.apiContract.name == null ? "" : apiNode.apiContract.name;

        const singleApiJson = genSingleApiJsonObj(sourceApimName, resourceGroup, templatesFolder, apiName);

        configFile = uris[0].fsPath.concat("/", apiName, ".json");
        noticeContent = `Extract API '${apiName}' to '${templatesFolder}'`;
        await fse.writeFile(configFile, singleApiJson);
    } else if (node instanceof AzureTreeItem) {
        const serviceNode: AzureTreeItem = node;

        const fullId = serviceNode.id === undefined ? "" : serviceNode.id;
        const apiParams = fullId.split("/");

        //generate linked templates
        const linkedApiJson = genLinkedApisJsonObj(apiParams[8], apiParams[4], templatesFolder);

        configFile = uris[0].fsPath.concat(Constants.extractorMasterJsonFile);
        noticeContent = `Extract all APIs from service '${apiParams[8]}' to '${templatesFolder}'`;
        await fse.writeFile(configFile, linkedApiJson);
    }

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("Extract Apis", noticeContent),
            cancellable: false
        },
        async () => { await runExtractor(configFile); }
    ).then(
        () => {
            window.showInformationMessage(localize("Extract Apis", `Extraction completed!`));
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

async function runExtractor(filePath: string): Promise<void> {
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

async function askFolder(): Promise<Uri[]> {
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

function genSingleApiJsonObj(sourceApimName: string, resourceGroup: string, templatesFolder: string, apiName: string): {} {
    return new SingleApiJsonObject(sourceApimName, resourceGroup, templatesFolder, apiName).stringify();
}

function genLinkedApisJsonObj(sourceApimName: string, resourceGroup: string, masterFolderPath: string): {} {
    return new LinkedApisJsonObject(sourceApimName, resourceGroup, masterFolderPath).stringify();
}
