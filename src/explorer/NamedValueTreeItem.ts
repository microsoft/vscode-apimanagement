/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NamedValueContract, NamedValueCreateContract } from "@azure/arm-apimanagement";
import { ProgressLocation, window } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, DialogResponses, IActionContext, UserCancelledError } from "@microsoft/vscode-azext-utils";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class NamedValueTreeItem extends AzExtTreeItem {
    public static contextValue: string = 'azureApiManagementNamedValue';
    public contextValue: string = NamedValueTreeItem.contextValue;
    private _label: string;
    public readonly root: IServiceTreeRoot;

    constructor(
        parent: AzExtParentTreeItem,
        public readonly propertyContract: NamedValueContract,
        root: IServiceTreeRoot) {
        super(parent);
        this.root = root;
        this._label = nonNullProp(this.propertyContract, 'displayName');
    }

    public get label() : string {
        return this._label;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('namedvalue');
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmNamedValue", `Are you sure you want to delete named value '${this.propertyContract.displayName}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("deletingNamedValue", `Deleting named value "${this.propertyContract.displayName}"...`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                await this.root.client.namedValue.delete(this.root.resourceGroupName, this.root.serviceName, nonNullProp(this.propertyContract, "name"), '*');
            });
            // don't wait
            window.showInformationMessage(localize("deletedNamedValue", `Successfully deleted named value "${this.propertyContract.displayName}".`));

        } else {
            throw new UserCancelledError();
        }
    }

    public async updateValue(context: IActionContext, newValue: string, secret?: boolean) : Promise<void> {
        const propertyContract: NamedValueCreateContract = {
            displayName: nonNullProp(this.propertyContract, "displayName"),
            value: newValue,
            secret: secret
        };

        try {
            await this.root.client.namedValue.beginCreateOrUpdateAndWait(this.root.resourceGroupName, this.root.serviceName, nonNullProp(this.propertyContract, "name"), propertyContract);
            await this.refresh(context);
        } catch (error) {
            throw new Error(processError(error, localize("updateNamedValueFailed", `Could not update the value for ${this.propertyContract.displayName}`)));
        }
    }

    public async getValue() : Promise<string> {
        try {
            const property = await this.root.client.namedValue.get(this.root.resourceGroupName, this.root.serviceName, nonNullProp(this.propertyContract, "name"));
            return property.value === undefined ? "" : property.value;
        } catch (error) {
            throw new Error(processError(error, localize("getNamedValueFailed", `Could not retrieve the value for ${this.propertyContract.displayName}`)));
        }
    }
}
