/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementClient, ApiManagementServiceResource } from '@azure/arm-apimanagement';
import { MessageItem } from 'vscode';
import { AzExtTreeItem, AzExtParentTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, ICreateChildImplContext, parseError, IActionContext, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { createAzureClient, LocationListStep, ResourceGroupCreateStep, ResourceGroupListStep, SubscriptionTreeItemBase, uiUtils } from '@microsoft/vscode-azext-azureutils';
import { IServiceWizardContext } from '../commands/createService/IServiceWizardContext';
import { ServiceCreateStep } from '../commands/createService/ServiceCreateStep';
import { ServiceNameStep } from '../commands/createService/ServiceNameStep';
import { ServiceSkuStep } from '../commands/createService/ServiceSkuStep';
import { extensionPrefix } from '../constants';
import { localize } from "../localize";
import { nonNullProp } from '../utils/nonNull';
import { getWorkspaceSetting, updateGlobalSetting } from '../vsCodeConfig/settings';
import { ServiceTreeItem } from './ServiceTreeItem';
import { treeUtils } from '../utils/treeUtils';

export function createSubscriptionTreeItem(
    parent: AzExtParentTreeItem,
    subscription: ISubscriptionContext,
): AzExtTreeItem {
    return new ApiManagementProvider(parent, subscription);
}

export class ApiManagementProvider extends SubscriptionTreeItemBase {
    public readonly childTypeLabel: string = localize('azureApiManagement.ApimService', 'API Management Service');

    private _nextLink: string | undefined;

    constructor(parent: AzExtParentTreeItem, subscription: ISubscriptionContext) {
        super(parent, subscription);
        this.iconPath = treeUtils.getIconPath('azureSubscription');
    }

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const client: ApiManagementClient = createAzureClient([context, this], ApiManagementClient);
        // Load more currently broken https://github.com/Azure/azure-sdk-for-js/issues/20380
        // TODO: Add pagination back when issue fixed
        let serviceCollection: ApiManagementServiceResource[];
        try {
            serviceCollection = await uiUtils.listAllIterator(client.apiManagementService.list());
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

        return await this.createTreeItemsWithErrorHandling(
            serviceCollection,
            "invalidApiManagementService",
            (service: ApiManagementServiceResource) => new ServiceTreeItem(this, client, service),
            (service: ApiManagementServiceResource) => {
                return service.name;
            });
    }

    // what are we doing here
    public async createChildImpl(context: ICreateChildImplContext): Promise<AzExtParentTreeItem> {
        //const actionContext: ICreateChildImplContext = context;
        const client: ApiManagementClient = createAzureClient([context, this], ApiManagementClient);

        // question
        const wizardContext: IServiceWizardContext = {
            client: client,
            subscriptionId: this.subscription.subscriptionId,
            subscriptionDisplayName: this.subscription.subscriptionDisplayName,
            credentials: this.subscription.credentials,
            environment: this.subscription.environment,
            subscriptionPath: "", // keep it this way for now
            userId: this.subscription.userId,
            tenantId: "",
            createCredentialsForScopes: this.subscription.createCredentialsForScopes,
            isCustomCloud: this.subscription.isCustomCloud,
            ...context
        };

        const promptSteps: AzureWizardPromptStep<IServiceWizardContext>[] = [];
        const executeSteps: AzureWizardExecuteStep<IServiceWizardContext>[] = [];

        promptSteps.push(new ServiceNameStep());
        wizardContext.email = this.subscription.userId;

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
                context.ui.showWarningMessage(message, btn).then(async result => {
                    if (result === btn) {
                        await updateGlobalSetting(advancedCreationKey, true);
                    }
                });
            }

            throw error;
        }

        const service: ApiManagementServiceResource = nonNullProp(wizardContext, 'service');
        return new ServiceTreeItem(this, client, service);
    }
}
