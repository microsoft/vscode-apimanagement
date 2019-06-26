/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "azure-arm-apimanagement";
import { AzureParentTreeItem, AzureTreeItem, createTreeItemsWithErrorHandling } from "vscode-azureextensionui";
import { topItemCount } from "../constants";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { NamedValueTreeItem } from "./NamedValueTreeItem";

export class NamedValuesTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementNamedValues';
    public label: string = "Named values";
    public contextValue: string = NamedValuesTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.NamedValue', 'Named value');
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzureTreeItem<IServiceTreeRoot>[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const propertyCollection: ApiManagementModels.PropertyCollection = this._nextLink === undefined ?
        await this.root.client.property.listByService(this.root.resourceGroupName, this.root.serviceName,  {top: topItemCount}) :
        await this.root.client.property.listByServiceNext(this._nextLink);

        this._nextLink = propertyCollection.nextLink;

        return createTreeItemsWithErrorHandling(
            this,
            propertyCollection,
            "invalidApiManagementNamedValue",
            async (prop: ApiManagementModels.PropertyContract) => new NamedValueTreeItem(this, prop),
            (prop: ApiManagementModels.PropertyContract) => {
                return prop.name;
            });
    }

    public async createChildImpl(showCreatingTreeItem: (label: string) => void, userOptions?: { key: string, value: string, secret?: boolean }): Promise<NamedValueTreeItem> {
        if (userOptions && userOptions.key && userOptions.value) {
            const keyName = userOptions.key;
            showCreatingTreeItem(keyName);

            const propertyContract = <ApiManagementModels.PropertyContract> {
                displayName: keyName,
                value: userOptions.value,
                secret: userOptions.secret
            };

            try {
                const property = await this.root.client.property.createOrUpdate(this.root.resourceGroupName, this.root.serviceName, keyName, propertyContract);
                return new NamedValueTreeItem(this, property);
            } catch (error) {
                throw new Error(processError(error, localize("createNamedValueFailed", `Failed to create the named value ${userOptions.key}`)));
            }
        } else {
            throw Error("Key and the value are expected.");
        }
    }
 }
