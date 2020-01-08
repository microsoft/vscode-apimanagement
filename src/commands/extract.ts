/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { OpenDialogOptions, ProgressLocation, Uri, window, workspace } from "vscode";
import * as Constants from '../constants';
import { ApiTreeItem } from '../explorer/ApiTreeItem';
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { cpUtils } from '../utils/cpUtils';
import { dotnetUtils } from '../utils/dotnetUtils';

export async function extractService(node?: ServiceTreeItem): Promise<void> {
    if (!node) {
        node = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue);
    }

    await extract(node);
}

export async function extractAPI(node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    const apiName = node.apiContract.name === undefined ? "" : node.apiContract.name;

    await extract(node, apiName);
}

async function extract(node: ApiTreeItem | ServiceTreeItem, apiName?: string): Promise<void> {
    const uris = await askFolder();
    const templatesFolder = await createTemplatesFolder(uris);
    const sourceApimName = node.root.serviceName;
    const resourceGroup = node.root.resourceGroupName;
    const extractConfig = generateExtractConfig(sourceApimName, resourceGroup, templatesFolder, apiName);

    let configFile = "";
    let noticeContent = "";

    if (apiName) {
        configFile = path.join(uris[0].fsPath, `${apiName}.json`);
        noticeContent = `Extracting API ARM template '${apiName}' to '${templatesFolder}'`;
    } else {
        configFile = path.join(uris[0].fsPath, `${sourceApimName}.json`);
        noticeContent = `Extracting service '${sourceApimName}' to '${templatesFolder}'`;
    }

    await fse.writeFile(configFile, extractConfig);

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("Extracting", noticeContent),
            cancellable: false
        },
        async () => {
            await dotnetUtils.checkDotnetInstalled();
            await runExtractor(configFile);
        }
    ).then(
        () => {
            window.showInformationMessage(localize("Extracted", `Extraction completed!`));
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
    const workingFolderPath = ext.context.asAbsolutePath(path.join('resources', 'devops'));
    ext.outputChannel.show();

    await cpUtils.executeCommand(
        ext.outputChannel,
        workingFolderPath,
        'dotnet',
        'apimtemplate.dll',
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
        openLabel: "Extract"
    };

    const rootPath = workspace.rootPath;
    if (rootPath) {
        openDialogOptions.defaultUri = Uri.file(rootPath);
    }
    return await ext.ui.showOpenDialog(openDialogOptions);
}

function generateExtractConfig(sourceApimName: string, resourceGroup: string, fileFolder: string, apiName?: string): string {
    const extractorConfig = {
        sourceApimName: sourceApimName,
        destinationApimName: "",
        resourceGroup: resourceGroup,
        fileFolder: fileFolder,
        apiName: apiName,
        linkedTemplatesBaseUrl: "",
        linkedTemplatesUrlQueryString: "",
        policyXMLBaseUrl: ""
    };

    return JSON.stringify(extractorConfig);
}
