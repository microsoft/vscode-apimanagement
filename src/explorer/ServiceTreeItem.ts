/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementClient, ApiManagementServiceResource } from "@azure/arm-apimanagement";
import { ProgressLocation, window } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, DialogResponses, ISubscriptionContext, UserCancelledError } from "@microsoft/vscode-azext-utils";
import { localize } from "../localize";
import { getResourceGroupFromId } from "../utils/azure";
import { nonNullProp, nonNullValue } from "../utils/nonNull";
import { treeUtils } from '../utils/treeUtils';
import { ApiOperationTreeItem } from "./ApiOperationTreeItem";
import { ApiPolicyTreeItem } from "./ApiPolicyTreeItem";
import { ApisTreeItem } from "./ApisTreeItem";
import { ApiTreeItem } from "./ApiTreeItem";
import { AuthorizationAccessPolicyTreeItem } from "./AuthorizationAccessPolicyTreeItem";
import { AuthorizationProvidersTreeItem } from "./AuthorizationProvidersTreeItem";
import { AuthorizationProviderTreeItem } from "./AuthorizationProviderTreeItem";
import { AuthorizationTreeItem } from "./AuthorizationTreeItem";
import { GatewaysTreeItem } from "./GatewaysTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { NamedValuesTreeItem } from "./NamedValuesTreeItem";
import { NamedValueTreeItem } from "./NamedValueTreeItem";
import { OperationPolicyTreeItem } from "./OperationPolicyTreeItem";
import { ProductPolicyTreeItem } from "./ProductPolicyTreeItem";
import { ProductsTreeItem } from "./ProductsTreeItem";
import { ProductTreeItem } from "./ProductTreeItem";
import { ServicePolicyTreeItem } from "./ServicePolicyTreeItem";
import { SubscriptionsTreeItem } from "./SubscriptionsTreeItem";
import { McpServersTreeItem } from "./McpServersTreeItem";

export class ServiceTreeItem extends AzExtParentTreeItem {

    public get root(): IServiceTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('apim');
    }

    public get id(): string {
        return nonNullProp(this.apiManagementService, 'id');
    }
    public static contextValue: string = 'azureApiManagementService';
    public label: string = nonNullProp(this.apiManagementService, 'name');
    public contextValue: string = ServiceTreeItem.contextValue;
    public readonly apisTreeItem: ApisTreeItem;
    public readonly servicePolicyTreeItem: ServicePolicyTreeItem;
    public readonly namedValuesTreeItem: NamedValuesTreeItem;
    public readonly productsTreeItem: ProductsTreeItem;
    public readonly gatewaysTreeItem: GatewaysTreeItem;
    public readonly subscriptionsTreeItem: SubscriptionsTreeItem;
    public readonly mcpServersTreeItem: McpServersTreeItem;
    public readonly authorizationProvidersTreeItem: AuthorizationProvidersTreeItem;

    private _root: IServiceTreeRoot;

    constructor(
        parent: AzExtParentTreeItem,
        public readonly apiManagementClient: ApiManagementClient,
        public readonly apiManagementService: ApiManagementServiceResource) {
        super(parent);

        this._root = this.createRoot(parent.subscription, apiManagementClient);
        this.servicePolicyTreeItem = new ServicePolicyTreeItem(this, this.root);
        this.apisTreeItem = new ApisTreeItem(this, this.root);
        this.productsTreeItem = new ProductsTreeItem(this, this.root);
        this.namedValuesTreeItem = new NamedValuesTreeItem(this, this.root);
        this.subscriptionsTreeItem = new SubscriptionsTreeItem(this, this.root);
        //parent.iconPath =

        const sku = nonNullValue(this.apiManagementService.sku.name);
        if (sku === 'Developer' || sku === 'Premium') {
            this.gatewaysTreeItem = new GatewaysTreeItem(this, this.root);
        }

        this.mcpServersTreeItem = new McpServersTreeItem(this, this.root);
        this.authorizationProvidersTreeItem = new AuthorizationProvidersTreeItem(this, this.root);
    }

    public static createEnvironmentTreeItem(parent: AzExtParentTreeItem, apiManagementClient: ApiManagementClient, apiManagementService: ApiManagementServiceResource): ServiceTreeItem {
        return new ServiceTreeItem(parent, apiManagementClient, apiManagementService);
    }

    public async loadMoreChildrenImpl(): Promise<AzExtTreeItem[]> {
        if (this.gatewaysTreeItem === undefined) {
            return [this.apisTreeItem, this.namedValuesTreeItem, this.productsTreeItem, this.servicePolicyTreeItem, this.subscriptionsTreeItem, this.authorizationProvidersTreeItem, this.mcpServersTreeItem];
        }
        return [this.apisTreeItem, this.namedValuesTreeItem, this.productsTreeItem, this.servicePolicyTreeItem, this.gatewaysTreeItem, this.subscriptionsTreeItem, this.authorizationProvidersTreeItem, this.mcpServersTreeItem];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async deleteTreeItemImpl() : Promise<void> {
        const message: string = localize("confirmDeleteService", `Are you sure you want to delete API Management instance '${this.root.serviceName}' and its contents?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("deletingService", `Deleting API Management instance "${this.root.serviceName}"...`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                await this.root.client.apiManagementService.beginDelete(this.root.resourceGroupName, this.root.serviceName);
            });
            // don't wait
            window.showInformationMessage(localize("deletedService", `Successfully deleted API Management instance "${this.root.serviceName}".`));

        } else {
            throw new UserCancelledError();
        }
    }

    public async copySubscriptionKey(): Promise<string> {
        const subscriptionKeys = await this.root.client.subscription.listSecrets(this.root.resourceGroupName, this.root.serviceName, "master");
        if (!subscriptionKeys.secondaryKey) {
            window.showErrorMessage(localize("CopySubscriptionKey", `Secondary Subscription Key Unexpectedly null.`));
        } else {
            return subscriptionKeys.secondaryKey;
        }
        return "";
    }

    public pickTreeItemImpl(expectedContextValues: (string | RegExp)[]): AzExtTreeItem | undefined {
        for (const expectedContextValue of expectedContextValues) {
            switch (expectedContextValue) {
                case ApiTreeItem.contextValue:
                case ApiPolicyTreeItem.contextValue:
                case ApiOperationTreeItem.contextValue:
                case OperationPolicyTreeItem.contextValue:
                    return this.apisTreeItem;
                case NamedValueTreeItem.contextValue:
                    return this.namedValuesTreeItem;
                case ProductTreeItem.contextValue:
                case ProductPolicyTreeItem.contextValue:
                    return this.productsTreeItem;
                case AuthorizationProviderTreeItem.contextValue:
                case AuthorizationTreeItem.contextValue:
                case AuthorizationAccessPolicyTreeItem.contextValue:
                    return this.authorizationProvidersTreeItem;
                default:
            }
        }

        return undefined;
    }

    private createRoot(subRoot: ISubscriptionContext, client: ApiManagementClient): IServiceTreeRoot {
        return Object.assign({}, subRoot, {
            client: client,
            serviceName : nonNullProp(this.apiManagementService, 'name'),
            resourceGroupName: getResourceGroupFromId(nonNullProp(this.apiManagementService, 'id'))
        });
    }
}
