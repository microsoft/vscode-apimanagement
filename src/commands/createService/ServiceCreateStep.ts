/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "azure-arm-apimanagement";
import { ApiManagementServiceResource } from "azure-arm-apimanagement/lib/models";
import { MessageItem, Progress, window } from "vscode";
import { AzureWizardExecuteStep } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { nonNullProp, nonNullValueAndProp } from "../../utils/nonNull";
import { IServiceWizardContext } from "./IServiceWizardContext";

export class ServiceCreateStep extends AzureWizardExecuteStep<IServiceWizardContext> {
    public priority: number = 140;

    public async execute(wizardContext: IServiceWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const creatingNewService: string = localize('creatingNewAPIManagementService', 'Creating new API Management service "{0}"...', wizardContext.serviceName);
        ext.outputChannel.appendLine(creatingNewService);
        progress.report({ message: creatingNewService });
        wizardContext.service = await wizardContext.client.apiManagementService.createOrUpdate(nonNullValueAndProp(wizardContext.resourceGroup, 'name'), nonNullProp(wizardContext, 'serviceName'), <ApiManagementServiceResource>{
            location: nonNullValueAndProp(wizardContext.location, 'name'),
            sku: <ApiManagementModels.ApiManagementServiceSkuProperties>{
                name: nonNullValueAndProp(wizardContext, 'sku')
            },
            publisherEmail: nonNullValueAndProp(wizardContext, 'email'),
            publisherName: nonNullValueAndProp(wizardContext, 'email')
          });

        const createdNewService: string = localize('createdNewAPIManagementService', 'Created new API Management service "{0}".', wizardContext.service.name);

        ext.outputChannel.appendLine(createdNewService);
        ext.outputChannel.appendLine('');
        const viewOutput: MessageItem = {
            title: localize('viewOutput', 'View Output')
        };

      // Note: intentionally not waiting for the result of this before returning
        window.showInformationMessage(createdNewService, viewOutput).then((result: MessageItem | undefined) => {
          if (result === viewOutput) {
              ext.outputChannel.show();
          }
      });

    }
    public shouldExecute(wizardContext: IServiceWizardContext): boolean {
        return !wizardContext.service;
    }
}
