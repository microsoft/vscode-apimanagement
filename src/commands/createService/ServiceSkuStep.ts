/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { IServiceWizardContext } from "./IServiceWizardContext";

export class ServiceSkuStep extends AzureWizardPromptStep<IServiceWizardContext> {
    public async prompt(wizardContext: IServiceWizardContext): Promise<void> {
        const skus = ['Consumption', 'Developer', 'Standard', 'Basic', 'Premium'];
        const sku = await ext.ui.showQuickPick( skus.map((s) => {return { label: s, description: '', detail: '' }; }) , { canPickMany: false});
        wizardContext.sku = sku.label;
    }

    public shouldPrompt(wizardContext: IServiceWizardContext): boolean {
        return !wizardContext.sku;
    }
}
