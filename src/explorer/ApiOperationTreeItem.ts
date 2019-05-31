/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "azure-arm-apimanagement";
import { ProgressLocation, window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, ISubscriptionRoot, UserCancelledError } from "vscode-azureextensionui";
import { OperationConsole } from "../operationConsole/OperationConsole";
import { nodeUtils } from "../utils/nodeUtils";
import { nonNullProp } from "../utils/nonNull";
import { IApiTreeRoot } from "./IApiTreeRoot";
import { IOperationTreeRoot } from "./IOperationTreeRoot";
import { OperationPolicyTreeItem } from "./OperationPolicyTreeItem";
import { localize } from "../localize";

export class ApiOperationTreeItem extends AzureParentTreeItem<IOperationTreeRoot> {
    public static contextValue: string = 'azureApiManagementApiOperation';
    public contextValue: string = ApiOperationTreeItem.contextValue;
    public readonly commandId: string = 'extension.showArmApiOperation';
    public readonly policyTreeItem: OperationPolicyTreeItem;

    private _name: string;
    private _label: string;

    public get root(): IOperationTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return nodeUtils.getThemedIconPath('op');
    }

    public get label() : string {
        return this._label;
    }

    public get id(): string {
        return this._name;
    }

    private _root: IOperationTreeRoot;
    private constructor(
        parent: AzureParentTreeItem,
        public readonly operationContract: ApiManagementModels.OperationContract) {
        super(parent);

        this._root = this.createRoot(parent.root);
        this.policyTreeItem = new OperationPolicyTreeItem(this);

        this._label = `[${nonNullProp(this.operationContract, 'method')}] ${nonNullProp(this.operationContract, 'displayName')}`;
        this._name = nonNullProp(this.operationContract, 'name');
    }

    public static async create(
        parent: AzureParentTreeItem,
        operation: ApiManagementModels.OperationContract): Promise<ApiOperationTreeItem> {
        return new ApiOperationTreeItem(parent, operation);
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IOperationTreeRoot>[]> {
        return [this.policyTreeItem];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async deleteTreeItemImpl() : Promise<void> {
        const message: string = localize("confirmDeleteOperation", `Are you sure you want to delete operation '${this.root.opName}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = `Deleting operation "${this.root.opName}"...`;
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                await this.root.client.apiOperation.deleteMethod(this.root.resourceGroupName, this.root.serviceName, this.root.apiName, this.root.opName, '*');
            });
            // don't wait
            window.showInformationMessage(localize("deletedOperation", `Successfully deleted API "${this.root.apiName}".`));

        } else {
            throw new UserCancelledError();
        }
    }

    public async getOperationTestInfo(): Promise<string> {
        return await new OperationConsole().buildRequestInfo(this.root);
    }

    private createRoot(subRoot: ISubscriptionRoot): IOperationTreeRoot {
        return Object.assign({}, <IApiTreeRoot>subRoot, {
            opName : nonNullProp(this.operationContract, 'name')
        });
    }
}
