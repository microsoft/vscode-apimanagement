/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from 'vscode-azureextensionui';
import * as Constants from '../../constants';
import { ServiceTreeItem } from '../../explorer/ServiceTreeItem';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ApiOpsTooling} from "../../utils/ApiOpsTooling";
import { azUtils } from '../../utils/azUtils';
import { cpUtils } from '../../utils/cpUtils';
import { ExtensionHelper } from "../../utils/ExtensionHelper";
import { askFolder } from '../../utils/vscodeUtils';

export async function importService(context: IActionContext, node?: ServiceTreeItem): Promise<void> {
    if (!node) {
        node = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
    }

    const uri = await askFolder("Import");
    const sourceApimName = node.root.serviceName;
    const resourceGroup = node.root.resourceGroupName;
    const subscriptionId = node.root.subscriptionId;

    const noticeContent = localize("Publish", `Publishing '${uri}' to '${sourceApimName}' service.`);

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("Extracting", noticeContent),
            cancellable: false
        },
        async () => {
            await azUtils.checkAzInstalled();
            await runPublisher(uri.fsPath, sourceApimName, resourceGroup, subscriptionId);
        }
    ).then(
        () => {
            window.showInformationMessage(localize("Published", `Publish completed!`));
        });
}

async function runPublisher(filePath: string, apimName: string, resourceGroupName: string, subscriptionId: string): Promise<void> {
    ext.outputChannel.show();

    // Check our APIOps tooling has been downloaded
    const downloader = new ApiOpsTooling(ext.context, new ExtensionHelper());
    await downloader.downloadGitHubReleaseIfMissing(Constants.publisherBinaryName);

    await azUtils.setSubscription(subscriptionId, ext.outputChannel);

    // It's not on the PATH so you need ./
    await cpUtils.executeCommand(
        ext.outputChannel,
        await downloader.getDownloadStoragePath(),
        `./${Constants.publisherBinaryName}`,
        `AZURE_SUBSCRIPTION_ID=${subscriptionId}`,
        `API_MANAGEMENT_SERVICE_OUTPUT_FOLDER_PATH=${filePath}`,
        `API_MANAGEMENT_SERVICE_NAME=${apimName}`,
        `AZURE_RESOURCE_GROUP_NAME=${resourceGroupName}`
    );
}
