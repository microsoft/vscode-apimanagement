/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { AzureAccountTreeItemBase } from '@microsoft/vscode-azext-azureutils';
import { ApiManagementProvider } from './ApiManagementProvider';

export class AzureAccountTreeItem extends AzureAccountTreeItemBase {
    public constructor(testAccount?: {}) {
        super(undefined, testAccount);
    }

    public createSubscriptionTreeItem(root: ISubscriptionContext): ApiManagementProvider {
        return new ApiManagementProvider(this, root);
    }
}
