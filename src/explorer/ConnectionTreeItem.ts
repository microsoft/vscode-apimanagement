/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, UserCancelledError } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IConnectionContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { ITokenProviderTreeRoot } from "./ITokenProviderTreeRoot";

export class ConnectionTreeItem extends AzureTreeItem<ITokenProviderTreeRoot> {
    public static contextValue: string = 'azureApiManagementConnection';
    public contextValue: string = ConnectionTreeItem.contextValue;
    private _label: string;

    constructor(
        parent: AzureParentTreeItem,
        public readonly connectionContract: IConnectionContract) {
        super(parent);
        this._label = nonNullProp(connectionContract, 'name');
    }

    public get label() : string {
        return this._label;
    }

    public get description(): string | undefined {
        return this.connectionContract.properties.Status;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('api');
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmConnectionRemove", `Are you sure you want to remove Connection '${this.connectionContract.name}' from TokenProvider '${this.root.tokenProviderName}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("removingConnection", `Removing Connection "${this.connectionContract.name}" from TokenProvider '${this.root.tokenProviderName}.'`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                await apimService.deleteConnection(this.root.tokenProviderName, nonNullProp(this.connectionContract, "name"));
            });
            // don't wait
            window.showInformationMessage(localize("removedGatewayApi", `Successfully removed Connection "${this.connectionContract.name}" from TokenProvider '${this.root.tokenProviderName}'.`));

        } else {
            throw new UserCancelledError();
        }
    }
}
