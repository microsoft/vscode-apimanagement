/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "azure-arm-apimanagement";
import { ProgressLocation, window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, ISubscriptionRoot, UserCancelledError } from "vscode-azureextensionui";
import { localize } from "../localize";
import { nodeUtils } from "../utils/nodeUtils";
import { nonNullProp } from "../utils/nonNull";
import { ApiOperationsTreeItem } from "./ApiOperationsTreeItem";
import { ApiOperationTreeItem } from "./ApiOperationTreeItem";
import { ApiPolicyTreeItem } from "./ApiPolicyTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { OperationPolicyTreeItem } from "./OperationPolicyTreeItem";

export class ApiTreeItem extends AzureParentTreeItem<IApiTreeRoot> {
    public static contextValue: string = 'azureApiManagementApi';
    public contextValue: string = ApiTreeItem.contextValue;
    public readonly commandId: string = 'extension.showArmApi';
    public readonly policyTreeItem: ApiPolicyTreeItem;

    private _name: string;
    private _label: string;
    private _root: IApiTreeRoot;
    private readonly _operationsTreeItem: ApiOperationsTreeItem;

    private constructor(
        parent: AzureParentTreeItem,
        public readonly apiContract: ApiManagementModels.ApiContract,
        apiVersion?: string) {
        super(parent);

        if (!apiVersion) {
            this._label = nonNullProp(this.apiContract, 'displayName');
        } else {
            this._label = apiVersion;
        }

        this._name = nonNullProp(this.apiContract, 'name');
        this._root = this.createRoot(parent.root);
        this._operationsTreeItem = new ApiOperationsTreeItem(this);
        this.policyTreeItem = new ApiPolicyTreeItem(this);
    }

    public get id(): string {
        return this._name;
    }

    public get label() : string {
        return this._label;
    }

    public get root(): IApiTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return nodeUtils.getThemedIconPath('api');
    }

    public static async create(
        parent: AzureParentTreeItem,
        api: ApiManagementModels.ApiContract,
        apiVersion?: string): Promise<ApiTreeItem> {
        return new ApiTreeItem(parent, api, apiVersion);
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IApiTreeRoot>[]> {
        return [this._operationsTreeItem, this.policyTreeItem];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmDeleteApi", `Are you sure you want to delete API '${this.root.apiName}' and its contents?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("deletingApi", `Deleting API "${this.root.apiName}"...`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                await this.root.client.api.deleteMethod(this.root.resourceGroupName, this.root.serviceName, this.root.apiName, '*');
            });
            // don't wait
            window.showInformationMessage(localize("deletedApi", `Successfully deleted API "${this.root.apiName}".`));

        } else {
            throw new UserCancelledError();
        }
    }

    public pickTreeItemImpl(expectedContextValue: string | RegExp): AzureTreeItem<IApiTreeRoot> | undefined {
        if (expectedContextValue === OperationPolicyTreeItem.contextValue
            || expectedContextValue === ApiOperationTreeItem.contextValue ) {
            return this._operationsTreeItem;
        }
        return undefined;
    }

    private createRoot(subRoot: ISubscriptionRoot): IApiTreeRoot {
        return Object.assign({}, <IServiceTreeRoot>subRoot, {
            apiName: nonNullProp(this.apiContract, 'name')
        });
    }
}
