// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AzExtTreeItem, IActionContext, openUrl } from '@microsoft/vscode-azext-utils';
import { APIMAccount, AzureAccountCreateUrl } from "../constants";

export async function openUrlFromTreeNode(context: IActionContext, node?: AzExtTreeItem) {
    context;
    switch (node?.id) {
        case APIMAccount.createAzureAccount: {
            await openUrl(AzureAccountCreateUrl.createAzureAccountUrl);
            break;
        }
        case APIMAccount.createAzureStudentAccount: {
            await openUrl(AzureAccountCreateUrl.createAzureStudentUrl);
            break;
        }
    }
}
