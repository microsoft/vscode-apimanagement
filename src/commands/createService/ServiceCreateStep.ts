/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementServiceSkuProperties } from "@azure/arm-apimanagement";
import { ApiManagementServiceResource } from "@azure/arm-apimanagement/src/models";
import { MessageItem, Progress, window } from "vscode";
import { AzureWizardExecuteStep } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { nonNullProp, nonNullValueAndProp } from "../../utils/nonNull";
import { IServiceWizardContext } from "./IServiceWizardContext";
import { LocationListStep } from "@microsoft/vscode-azext-azureutils";

export class ServiceCreateStep extends AzureWizardExecuteStep<IServiceWizardContext> {
    public priority: number = 140;

    public async execute(wizardContext: IServiceWizardContext, progress: Progress<{ message?: string; increment?: number }>): Promise<void> {
        const creatingNewService: string = localize('creatingNewAPIManagementService', 'Creating new API Management service "{0}"...', wizardContext.serviceName);
        ext.outputChannel.appendLine(creatingNewService);
        progress.report({ message: creatingNewService });
        const location = await LocationListStep.getLocation(wizardContext);
        wizardContext.service = await wizardContext.client.apiManagementService.beginCreateOrUpdateAndWait(nonNullValueAndProp(wizardContext.resourceGroup, 'name'), nonNullProp(wizardContext, 'serviceName'), <ApiManagementServiceResource>{
            location: nonNullValueAndProp(location, 'name'),
            sku: <ApiManagementServiceSkuProperties>{
                name: nonNullValueAndProp(wizardContext, 'sku'),
                capacity: wizardContext.sku === 'Consumption' ? 0 : 1
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
