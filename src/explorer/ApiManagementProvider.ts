/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementClient, ApiManagementModels } from '@azure/arm-apimanagement';
import { ApiManagementServiceListResponse } from '@azure/arm-apimanagement/src/models';
import { MessageItem } from 'vscode';
import { AzExtTreeItem, AzureParentTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, createAzureClient, ICreateChildImplContext, IErrorHandlingContext, LocationListStep, parseError, ResourceGroupCreateStep, ResourceGroupListStep, SubscriptionTreeItemBase } from 'vscode-azureextensionui';
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
        let apiManagementServiceListResponse: ApiManagementServiceListResponse;
        try {
            apiManagementServiceListResponse = this._nextLink === undefined ?
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

        this._nextLink = apiManagementServiceListResponse._response.parsedBody.nextLink;

        return await this.createTreeItemsWithErrorHandling(
            apiManagementServiceListResponse._response.parsedBody,
            "invalidApiManagementService",
            (service: ApiManagementModels.ApiManagementServiceResource) => new ServiceTreeItem(this, client, service),
            (service: ApiManagementModels.ApiManagementServiceResource) => {
                return service.name;
            });
    }

    // what are we doing here
    public async createChildImpl(context: ICreateChildImplContext): Promise<AzureParentTreeItem> {
        //const actionContext: ICreateChildImplContext = context;
        const client: ApiManagementClient = createAzureClient(this.root, ApiManagementClient);

        const errorhandler: IErrorHandlingContext = {
            issueProperties: {}
        };

        // question
        const wizardContext: IServiceWizardContext = {
            client: client,
            subscriptionId: this.root.subscriptionId,
            subscriptionDisplayName: this.root.subscriptionDisplayName,
            credentials: this.root.credentials,
            environment: this.root.environment,
            subscriptionPath: "", // keep it this way for now
            userId: this.root.userId,
            tenantId: "",
            ...context,
            errorHandling: errorhandler // keep it empty for now
        };

        const promptSteps: AzureWizardPromptStep<IServiceWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IServiceWizardContext>[] = [];

        promptSteps.push(new ServiceNameStep());
        wizardContext.email = this.root.userId;

        const advancedCreationKey: string = 'advancedCreation';
        // tslint:disable-next-line: strict-boolean-expressions
        const advancedCreation: boolean = !!getWorkspaceSetting(advancedCreationKey);
        //actionContext.advancedCreation = advancedCreation;
        if (!advancedCreation) {
            wizardContext.sku = "Consumption";
            await LocationListStep.setLocation(wizardContext, 'westus');
            executeSteps.push(new ResourceGroupCreateStep());
        } else {
            promptSteps.push(new ServiceSkuStep());
            //promptSteps.push(new LocationListStep());
            promptSteps.push(new ResourceGroupListStep());
            LocationListStep.addStep(wizardContext, promptSteps);
        }

        executeSteps.push(new ServiceCreateStep());

        const title: string = localize('serviceCreatingTitle', 'Create new API Management instance in Azure');
        const wizard: AzureWizard<IServiceWizardContext> = new AzureWizard(wizardContext, { promptSteps, executeSteps, title });

        await wizard.prompt();
        context.showCreatingTreeItem(nonNullProp(wizardContext, 'serviceName'));

        if (!advancedCreation) {
            const newName: string | undefined = await wizardContext.relatedNameTask;
            if (!newName) {
                throw new Error(localize('noUniqueName', 'Failed to generate unique name for resources.'));
            }
            wizardContext.newResourceGroupName = newName;
        }

        try {
            await wizard.execute();
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
