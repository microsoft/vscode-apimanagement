/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { OpenDialogOptions, ProgressLocation, Uri, window, workspace } from "vscode";
import { IActionContext } from 'vscode-azureextensionui';
import * as Constants from '../constants';
import { ApiTreeItem } from '../explorer/ApiTreeItem';
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { azUtils } from '../utils/azUtils';
import { cpUtils } from '../utils/cpUtils';
import { dotnetUtils } from '../utils/dotnetUtils';

export async function extractService(context: IActionContext, node?: ServiceTreeItem): Promise<void> {
    if (!node) {
        node = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
    }

    await extract(node);
}

export async function extractAPI(context: IActionContext, node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue, context);
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
    const subscriptionId = node.root.subscriptionId;

    let configFile = "";
    let noticeContent = "";

    if (apiName) {
        configFile = path.join(uris[0].fsPath, `${apiName}.json`);
        noticeContent = localize("Extract", `Extracting API ARM template '${apiName}' to '${templatesFolder}'`);
    } else {
        configFile = path.join(uris[0].fsPath, `${sourceApimName}.json`);
        noticeContent = localize("Extract", `Extracting service '${sourceApimName}' to '${templatesFolder}'`);
    }

    await fse.writeFile(configFile, extractConfig);

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("Extracting", noticeContent),
            cancellable: false
        },
        async () => {
            await azUtils.checkAzInstalled();
            await dotnetUtils.checkDotnetInstalled();
            await runExtractor(configFile, subscriptionId);
        }
    ).then(
        () => {
            window.showInformationMessage(localize("Extracted", `Extraction completed!`));
        });
}

async function createTemplatesFolder(uris: Uri[]): Promise<string> {
    const uri = uris[0];
    const templatesFolder = path.join(uri.fsPath, Constants.templatesFolder);
    if (!fse.existsSync(templatesFolder)) {
        await fse.mkdir(templatesFolder);
    } else {
        await fse.emptyDir(templatesFolder);
    }
    return templatesFolder;
}

async function runExtractor(filePath: string, subscriptionId: string): Promise<void> {
    const workingFolderPath = ext.context.asAbsolutePath(path.join('resources', 'devops'));
    ext.outputChannel.show();

    await cpUtils.executeCommand(
        ext.outputChannel,
        workingFolderPath,
        'az',
        'login'
    );

    await cpUtils.executeCommand(
        ext.outputChannel,
        workingFolderPath,
        'az',
        'account',
        'set',
        '--subscription',
        subscriptionId
    );

    if (await dotnetUtils.checkDotnetVersionInstalled("2.1")) {
        await cpUtils.executeCommand(
            ext.outputChannel,
            workingFolderPath,
            'dotnet',
            'apimtemplate.dll',
            'extract',
            '--extractorConfig',
            `"${filePath}"`
        );
    } else {
        window.showInformationMessage(localize("dotnetNotInstalled", ".NET framework 2.1 not installed. Please go to 'https://aka.ms/dotnet-core-applaunch?framework=Microsoft.NETCore.App&framework_version=2.1.0&arch=x64&rid=win10-x64' to download"));
        throw new Error();
    }
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
