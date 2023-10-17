/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { ProgressLocation, Uri, window } from "vscode";
import { IActionContext } from 'vscode-azureextensionui';
import * as Constants from '../constants';
import { ApiTreeItem } from '../explorer/ApiTreeItem';
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { azUtils } from '../utils/azUtils';
import { cpUtils } from '../utils/cpUtils';
import { askFolder } from '../utils/vscodeUtils';
import ApiOpsTooling from '../utils/ApiOpsTooling';
import ExtensionHelper from '../utils/extensionUtil';

export async function exportService(context: IActionContext, node?: ServiceTreeItem): Promise<void> {
    if (!node) {
        node = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
    }

    await extract(node);
}

export async function exportAPI(context: IActionContext, node?: ApiTreeItem): Promise<void> {
    if (!node) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue, context);
    }

    const apiName = node.apiContract.name === undefined ? "" : node.apiContract.name;

    await extract(node, apiName);
}

async function extract(node: ApiTreeItem | ServiceTreeItem, apiName?: string): Promise<void> {

    const uri = await askFolder("Export");
    const sourceApimName = node.root.serviceName;
    const resourceGroup = node.root.resourceGroupName;
    const subscriptionId = node.root.subscriptionId;
    const templatesFolder = await createTemplatesFolder(uri, sourceApimName);
    const noticeContent = await generateExtractConfig(templatesFolder, sourceApimName, apiName);

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("Extracting", noticeContent),
            cancellable: false
        },
        async () => {
            await azUtils.checkAzInstalled();
            await runExtractor(templatesFolder, sourceApimName, resourceGroup, subscriptionId);
        }
    ).then(
        () => {
            window.showInformationMessage(localize("Exported", `Export completed!`));
        });
}

async function createTemplatesFolder(uri: Uri, sourceApimName: string): Promise<string> {
    const templatesFolder = path.join(uri.fsPath, sourceApimName);
    if (!fse.existsSync(templatesFolder)) {
        await fse.mkdir(templatesFolder);
    } else {
        await fse.emptyDir(templatesFolder);
    }
    return templatesFolder;
}

async function runExtractor(filePath: string, apimName: string, resourceGroupName: string, subscriptionId: string): Promise<void> {
    ext.outputChannel.show();

    // Check our APIOps tooling has been downloaded
    const downloader = new ApiOpsTooling(ext.context, new ExtensionHelper());
    await downloader.downloadExternalBinary(Constants.extractorBinaryName);

    await azUtils.setSubscription(subscriptionId, ext.outputChannel);

    const extractionConfigurationFilePath = path.join(filePath, "configuration.extractor.yaml");

    // It's not on the PATH so you need './'
    await cpUtils.executeCommand(
        ext.outputChannel,
        await downloader.getDownloadStoragePath(),
        `./${Constants.extractorBinaryName}`,
        `AZURE_SUBSCRIPTION_ID=${subscriptionId}`,
        `API_MANAGEMENT_SERVICE_OUTPUT_FOLDER_PATH=${filePath}`,
        `API_MANAGEMENT_SERVICE_NAME=${apimName}`,
        `AZURE_RESOURCE_GROUP_NAME=${resourceGroupName}`,
        `CONFIGURATION_YAML_PATH=${extractionConfigurationFilePath}`
    );
}

// The extractor has the ability to extract a single API or all APIs in a service. We will generate an
// empty file in the case of all APIs and a file with the name of the API in the case of a single API.
// This file will be set using CONFIGURATION_YAML_PATH
async function generateExtractConfig(templatesFolder: string, sourceApimName: string, apiName?: string): Promise<string> {
    const extractionConfigurationFilePath = path.join(templatesFolder, "configuration.extractor.yaml");
    let extractionConfiguration = {};
    let noticeContent = "";

    if (apiName) {
        extractionConfiguration = {
            apiNames: [apiName]
        };
        noticeContent = localize("Export", `Exporting API '${apiName}' to '${templatesFolder}'`);
    } else {
        noticeContent = localize("Export", `Exporting service '${sourceApimName}' to '${templatesFolder}'`);
    }

    const yamlStr = yaml.dump(extractionConfiguration);
    await fse.writeFile(extractionConfigurationFilePath, yamlStr);

    return noticeContent;
}