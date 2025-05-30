/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperationContract } from "@azure/arm-apimanagement";
import { ProgressLocation, window } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, DialogResponses, ISubscriptionContext, UserCancelledError } from "@microsoft/vscode-azext-utils";
import { localize } from "../localize";
import { OperationConsole } from "../operationConsole/OperationConsole";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IApiTreeRoot } from "./IApiTreeRoot";
import { IOperationTreeRoot } from "./IOperationTreeRoot";
import { OperationPolicyTreeItem } from "./OperationPolicyTreeItem";

export class ApiOperationTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureApiManagementApiOperation';
    public contextValue: string = ApiOperationTreeItem.contextValue;
    public readonly policyTreeItem: OperationPolicyTreeItem;

    private _name: string;
    private _label: string;

    public get root(): IOperationTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('op');
    }

    public get label() : string {
        return this._label;
    }

    public get id(): string {
        return this._name;
    }

    private _root: IOperationTreeRoot;
    constructor(
        parent: AzExtParentTreeItem,
        public readonly operationContract: OperationContract,
        root: IApiTreeRoot) {
        super(parent);

        this._root = this.createRoot(root);
        this.policyTreeItem = new OperationPolicyTreeItem(this, this.root);

        this._label = `[${nonNullProp(this.operationContract, 'method')}] ${nonNullProp(this.operationContract, 'displayName')}`;
        this._name = nonNullProp(this.operationContract, 'name');
    }

    public async loadMoreChildrenImpl(): Promise<AzExtTreeItem[]> {
        return [this.policyTreeItem];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async deleteTreeItemImpl() : Promise<void> {
        const message: string = localize("confirmDeleteOperation", `Are you sure you want to delete operation '${this.root.opName}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("", `Deleting operation "${this.root.opName}"...`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                await this.root.client.apiOperation.delete(this.root.resourceGroupName, this.root.serviceName, this.root.apiName, this.root.opName, '*');
            });
            // don't wait
            window.showInformationMessage(localize("deletedOperation", `Successfully deleted API Operation "${this.root.opName}".`));

        } else {
            throw new UserCancelledError();
        }
    }

    public async getOperationTestInfo(): Promise<string> {
        return await new OperationConsole().buildRequestInfo(this.root);
    }

    public async getOperationDebugInfo(): Promise<string> {
        return await new OperationConsole().buildDebugRequestInfo(this.root);
    }

    private createRoot(subRoot: ISubscriptionContext): IOperationTreeRoot {
        return Object.assign({}, <IApiTreeRoot>subRoot, {
            opName : nonNullProp(this.operationContract, 'name')
        });
    }
}
