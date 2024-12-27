/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NamedValueContract, NamedValueCreateContract, NamedValueCollection } from "@azure/arm-apimanagement";
import { AzExtTreeItem, AzExtParentTreeItem, ICreateChildImplContext } from "@microsoft/vscode-azext-utils";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { topItemCount } from "../constants";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { NamedValueTreeItem } from "./NamedValueTreeItem";

export interface INamedValuesTreeItemContext extends ICreateChildImplContext {
    key: string;
    value: string;
    secret?: boolean;
}

export class NamedValuesTreeItem extends AzExtParentTreeItem {
    public readonly root: IServiceTreeRoot;

    constructor(parent: AzExtParentTreeItem | undefined, root: IServiceTreeRoot) {
        super(parent);
        this.root = root;
    }

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

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        let propertyCollection: NamedValueContract[];
        propertyCollection = await uiUtils.listAllIterator(this.root.client.namedValue.listByService(this.root.resourceGroupName, this.root.serviceName));

        return this.createTreeItemsWithErrorHandling(
            propertyCollection,
            "invalidApiManagementNamedValue",
            async (prop: NamedValueContract) => new NamedValueTreeItem(this, prop, this.root),
            (prop: NamedValueContract) => {
                return prop.name;
            });
    }

    public async createChildImpl(context: INamedValuesTreeItemContext): Promise<NamedValueTreeItem> {
        if (context.key && context.value) {
            context.showCreatingTreeItem(context.key);

            const propertyContract: NamedValueCreateContract = {
                displayName: context.key,
                value: context.value,
                secret: context.secret
            };

            try {
                const property = await this.root.client.namedValue.beginCreateOrUpdateAndWait(this.root.resourceGroupName, this.root.serviceName, context.key, propertyContract);
                return new NamedValueTreeItem(this, property, this.root);
            } catch (error) {
                throw new Error(processError(error, localize("createNamedValueFailed", `Failed to create the named value ${context.key}`)));
            }
        } else {
            throw Error(localize("", "Key and the value are expected."));
        }
    }
}
