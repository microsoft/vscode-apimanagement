/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementServiceNameAvailabilityResult } from "@azure/arm-apimanagement";
import { ResourceGroupListStep, resourceGroupNamingRules } from "@microsoft/vscode-azext-azureutils";
import { AzureNameStep, IAzureNamingRules } from "@microsoft/vscode-azext-utils";
import { localize } from "../../localize";
import { nonNullProp } from "../../utils/nonNull";
import { IServiceWizardContext } from "./IServiceWizardContext";

export class ServiceNameStep extends AzureNameStep<IServiceWizardContext> {
    public async prompt(wizardContext: IServiceWizardContext): Promise<void> {
        const prompt: string = localize('serviceNamePrompt', 'Enter a globally unique name for the new API Management instance.');
        wizardContext.serviceName = (await wizardContext.ui.showInputBox({
            prompt,
            validateInput: async (value: string): Promise<string | undefined> => {
                value = value ? value.trim() : '';
                const nameAvailability: ApiManagementServiceNameAvailabilityResult = await wizardContext.client.apiManagementService.checkNameAvailability({name: value});
                if (nameAvailability.nameAvailable !== undefined && !nameAvailability.nameAvailable) {
                    return nameAvailability.message;
                } else {
                    return undefined;
                }
            }
        })).trim();

        const namingRules: IAzureNamingRules[] = [resourceGroupNamingRules];

        wizardContext.relatedNameTask = this.generateRelatedName(wizardContext, nonNullProp(wizardContext, "serviceName"), namingRules);
    }

    public shouldPrompt(wizardContext: IServiceWizardContext): boolean {
        return !wizardContext.serviceName;
    }

     protected async isRelatedNameAvailable(wizardContext: IServiceWizardContext, name: string): Promise<boolean> {
       return ResourceGroupListStep.isNameAvailable(wizardContext, name);
    }
}
