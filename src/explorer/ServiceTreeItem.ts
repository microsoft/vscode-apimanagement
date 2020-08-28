/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementClient, ApiManagementModels } from "azure-arm-apimanagement";
import { ProgressLocation, window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, ISubscriptionRoot, UserCancelledError } from "vscode-azureextensionui";
import { localize } from "../localize";
import { getResourceGroupFromId } from "../utils/azure";
import { nonNullProp, nonNullValue } from "../utils/nonNull";
import { treeUtils } from '../utils/treeUtils';
import { ApiOperationTreeItem } from "./ApiOperationTreeItem";
import { ApiPolicyTreeItem } from "./ApiPolicyTreeItem";
import { ApisTreeItem } from "./ApisTreeItem";
import { ApiTreeItem } from "./ApiTreeItem";
import { GatewaysTreeItem } from "./GatewaysTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { NamedValuesTreeItem } from "./NamedValuesTreeItem";
import { NamedValueTreeItem } from "./NamedValueTreeItem";
import { OperationPolicyTreeItem } from "./OperationPolicyTreeItem";
import { ProductPolicyTreeItem } from "./ProductPolicyTreeItem";
import { ProductsTreeItem } from "./ProductsTreeItem";
import { ProductTreeItem } from "./ProductTreeItem";
import { ServicePolicyTreeItem } from "./ServicePolicyTreeItem";

export class ServiceTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {

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

    private _root: IServiceTreeRoot;

    constructor(
        parent: AzureParentTreeItem,
        public readonly apiManagementClient: ApiManagementClient,
        public readonly apiManagementService: ApiManagementModels.ApiManagementServiceResource) {
        super(parent);

        this._root = this.createRoot(parent.root, apiManagementClient);
        this.servicePolicyTreeItem = new ServicePolicyTreeItem(this);
        this.apisTreeItem = new ApisTreeItem(this);
        this.productsTreeItem = new ProductsTreeItem(this);
        this.namedValuesTreeItem = new NamedValuesTreeItem(this);

        const sku = nonNullValue(this.apiManagementService.sku.name);
        if (sku === 'Developer' || sku === 'Premium') {
            this.gatewaysTreeItem = new GatewaysTreeItem(this);
        }
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IServiceTreeRoot>[]> {
        return [this.apisTreeItem, this.namedValuesTreeItem, this.productsTreeItem, this.servicePolicyTreeItem, this.gatewaysTreeItem];
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
                await this.root.client.apiManagementService.deleteMethod(this.root.resourceGroupName, this.root.serviceName);
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

    public pickTreeItemImpl(expectedContextValue: string | RegExp): AzureTreeItem<IServiceTreeRoot> | undefined {
        if (expectedContextValue === ApiTreeItem.contextValue
            || expectedContextValue === ApiPolicyTreeItem.contextValue
            || expectedContextValue === ApiOperationTreeItem.contextValue
            || expectedContextValue === OperationPolicyTreeItem.contextValue) {
            return this.apisTreeItem;
        } else if (expectedContextValue === NamedValueTreeItem.contextValue) {
            return this.namedValuesTreeItem;
        } else if (expectedContextValue === ProductTreeItem.contextValue
            ||  expectedContextValue === ProductPolicyTreeItem.contextValue) {
                return this.productsTreeItem;
        } else {
            return undefined;
        }
    }

    private createRoot(subRoot: ISubscriptionRoot, client: ApiManagementClient): IServiceTreeRoot {
        return Object.assign({}, subRoot, {
            client: client,
            serviceName : nonNullProp(this.apiManagementService, 'name'),
            resourceGroupName: getResourceGroupFromId(nonNullProp(this.apiManagementService, 'id'))
        });
    }
}
