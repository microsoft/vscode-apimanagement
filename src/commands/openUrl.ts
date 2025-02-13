// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AzExtTreeItem, IActionContext, openUrl } from '@microsoft/vscode-azext-utils';
import { APIMAccountCommandId, AzureAccountUrl } from "../constants";

export async function openUrlFromTreeNode(context: IActionContext, node?: AzExtTreeItem) {
    context;
    switch (node?.id) {
        case APIMAccountCommandId.createAzureAccount: {
            await openUrl(AzureAccountUrl.createAzureAccountUrl);
            break;
        }
        case APIMAccountCommandId.createAzureStudentAccount: {
            await openUrl(AzureAccountUrl.createAzureStudentUrl);
            break;
        }
    }
}
