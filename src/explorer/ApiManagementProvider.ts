/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementClient, ApiManagementModels } from '@azure/arm-apimanagement';
import { MessageItem } from 'vscode';
import { AzExtTreeItem, AzureTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, createAzureClient, IActionContext, LocationListStep, parseError, ResourceGroupCreateStep, ResourceGroupListStep, SubscriptionTreeItemBase } from 'vscode-azureextensionui';
import { IServiceWizardContext } from '../commands/createService/IServiceWizardContext';
import { ServiceCreateStep } from '../commands/createService/ServiceCreateStep';
import { ServiceNameStep } from '../commands/createService/ServiceNameStep';
import { ServiceSkuStep } from '../commands/createService/ServiceSkuStep';
import { extensionPrefix } from '../constants';
import { ext } from '../extensionVariables';
import { localize } from "../localize";
import { nonNullProp } from '../utils/nonNull';
import { getWorkspaceSetting, updateGlobalSetting } from '../vsCodeConfig/settings';
import { ServiceTreeItem } from './ServiceTreeItem';

export class ApiManagementProvider extends SubscriptionTreeItemBase {
    public readonly childTypeLabel: string = localize('azureApiManagement.ApimService', 'API Management Service');

    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: ApiManagementClient = createAzureClient(this.root, ApiManagementClient);
        let apiManagementServiceList: ApiManagementModels.ApiManagementServiceListResult;
        try {
            apiManagementServiceList = this._nextLink === undefined ?
                await client.apiManagementService.list() :
                await client.apiManagementService.listNext(this._nextLink);
        } catch (error) {
            if (parseError(error).errorType.toLowerCase() === 'notfound') {
                // This error type means the 'Microsoft.ApiManagement' provider has not been registered in this subscription
                // In that case, we know there are no Api Management Services, so we can return an empty array
                // (The provider will be registered automatically if the user creates a new Api Management Instance)
                return [];
            } else {
                throw error;
            }
        }

        this._nextLink = apiManagementServiceList.nextLink;

        return this.createTreeItemsWithErrorHandling(
            apiManagementServiceList,
            "invalidApiManagementService",
            // @ts-ignore
            async (service: ApiManagementModels.ApiManagementServiceResource) => new ServiceTreeItem(this, client, service),
            (service: ApiManagementModels.ApiManagementServiceResource) => {
                return service.name;
            });
    }

    // @ts-ignore
    public async createChildImpl(showCreatingTreeItem: (label: string) => void, userOptions?: { actionContext: IActionContext; resourceGroup?: string }): Promise<AzureTreeItem> {
        // Ideally actionContext should always be defined, but there's a bug with the NodePicker. Create a 'fake' actionContext until that bug is fixed
        // https://github.com/Microsoft/vscode-azuretools/issues/120
        // tslint:disable-next-line:strict-boolean-expressions
        // @ts-ignore
        const actionContext: IActionContext = userOptions ? userOptions.actionContext : <IActionContext>{ properties: {}, measurements: {} };
        const client: ApiManagementClient = createAzureClient(this.root, ApiManagementClient);

        const wizardContext: IServiceWizardContext = {
            client: client,
            subscriptionId: this.root.subscriptionId,
            subscriptionDisplayName: this.root.subscriptionDisplayName,
            credentials: this.root.credentials,
            environment: this.root.environment
        };

        const promptSteps: AzureWizardPromptStep<IServiceWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IServiceWizardContext>[] = [];

        promptSteps.push(new ServiceNameStep());
        wizardContext.email = this.root.userId;

        const advancedCreationKey: string = 'advancedCreation';
        // tslint:disable-next-line: strict-boolean-expressions
        const advancedCreation: boolean = !!getWorkspaceSetting(advancedCreationKey);
        actionContext.properties.advancedCreation = String(advancedCreation);
        if (!advancedCreation) {
            wizardContext.sku = "Consumption";
            await LocationListStep.setLocation(wizardContext, 'westus');
            executeSteps.push(new ResourceGroupCreateStep());
        } else {
            promptSteps.push(new ServiceSkuStep());
            promptSteps.push(new LocationListStep());
            promptSteps.push(new ResourceGroupListStep());
        }

        executeSteps.push(new ServiceCreateStep());

        const title: string = localize('serviceCreatingTitle', 'Create new API Management instance in Azure');
        const wizard: AzureWizard<IServiceWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title });

        await wizard.prompt(actionContext);
        showCreatingTreeItem(nonNullProp(wizardContext, 'serviceName'));

        if (!advancedCreation) {
            const newName: string | undefined = await wizardContext.relatedNameTask;
            if (!newName) {
                throw new Error(localize('noUniqueName', 'Failed to generate unique name for resources.'));
            }
            wizardContext.newResourceGroupName = newName;
        }

        try {
            await wizard.execute(actionContext);
        } catch (error) {
            if (!parseError(error).isUserCancelledError && !advancedCreation) {
                const message: string = localize('tryAdvancedCreate', 'Modify the setting "{0}.{1}" if you want to change the default values when creating a API Management Instance in Azure.', extensionPrefix, advancedCreationKey);
                const btn: MessageItem = { title: localize('turnOn', 'Turn on advanced creation') };
                // tslint:disable-next-line: no-floating-promises
                ext.ui.showWarningMessage(message, btn).then(async result => {
                    if (result === btn) {
                        await updateGlobalSetting(advancedCreationKey, true);
                    }
                });
            }

            throw error;
        }

        const service: ApiManagementModels.ApiManagementServiceResource = nonNullProp(wizardContext, 'service');
        return new ServiceTreeItem(this, client, service);
    }
}
