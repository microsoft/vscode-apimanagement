/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, ISubscriptionContext, UserCancelledError } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { ITokenProviderContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { ConnectionsTreeItem } from "./ConnectionsTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { ITokenProviderTreeRoot } from "./ITokenProviderTreeRoot";
import { TokenProvidersTreeItem } from "./TokenProvidersTreeItem";

export class TokenProviderTreeItem extends AzureParentTreeItem<ITokenProviderTreeRoot> {
    public static contextValue: string = 'azureApiManagementTokenProvider';
    public contextValue: string = TokenProviderTreeItem.contextValue;
    public readonly connectionsTreeItem: ConnectionsTreeItem;

    private _label: string;
    private _root: ITokenProviderTreeRoot;

    constructor(
        parent: TokenProvidersTreeItem,
        public readonly tokenProviderContract: ITokenProviderContract) {
        super(parent);
        this._label = nonNullProp(this.tokenProviderContract, 'name');
        this._root = this.createRoot(parent.root);

        this.connectionsTreeItem = new ConnectionsTreeItem(this);
    }

    public get label() : string {
        return this._label;
    }

    public get root(): ITokenProviderTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('gateway');
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<ITokenProviderTreeRoot>[]> {
        return [this.connectionsTreeItem];
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmDeleteTokenProvider", `Are you sure you want to remove Token Service '${this.tokenProviderContract.name}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("removingTokenProvider", `Removing Token Service "${this.tokenProviderContract.name}".'`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                await apimService.deleteTokenProvider(this.root.tokenProviderName);
            });
            // don't wait
            window.showInformationMessage(localize("removedTokenProvider", `Successfully removed Token Service "${this.tokenProviderContract.name}".`));

        } else {
            throw new UserCancelledError();
        }
    }

    private createRoot(subRoot: ISubscriptionContext): ITokenProviderTreeRoot {
        return Object.assign({}, <IServiceTreeRoot>subRoot, {
            tokenProviderName: nonNullProp(this.tokenProviderContract, 'name')
        });
    }
}
