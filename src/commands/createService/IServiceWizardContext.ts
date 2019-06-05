/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import ApiManagementClient from 'azure-arm-apimanagement';
import { ApiManagementServiceResource } from 'azure-arm-apimanagement/lib/models';
import { IResourceGroupWizardContext, IStorageAccountWizardContext } from 'vscode-azureextensionui';

export interface IServiceWizardContext extends IResourceGroupWizardContext, IStorageAccountWizardContext {
    client: ApiManagementClient;
    sku? : string;
    email? : string;
    serviceName?: string;
    service?: ApiManagementServiceResource;
}
