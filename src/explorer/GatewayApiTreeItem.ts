/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzureParentTreeItem, AzureTreeItem, DialogResponses, UserCancelledError } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IGatewayApiContract } from "../azure/apim/contracts";
import { localize } from "../localize";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { IGatewayTreeRoot } from "./IGatewayTreeRoot";

export class GatewayApiTreeItem extends AzureTreeItem<IGatewayTreeRoot> {
    public static contextValue: string = 'azureApiManagementGatewayApi';
    public contextValue: string = GatewayApiTreeItem.contextValue;
    private _label: string;

    constructor(
        parent: AzureParentTreeItem,
        public readonly gatewayApiContract: IGatewayApiContract) {
        super(parent);
        this._label = nonNullProp(gatewayApiContract, 'name');
    }

    public get label() : string {
        return this._label;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('api');
    }

    public async deleteTreeItemImpl(): Promise<void> {
        const message: string = localize("confirmGatewayAPIRemove", `Are you sure you want to remove API '${this.gatewayApiContract.name}' from gateway '${this.root.gatewayName}'?`);
        const result = await window.showWarningMessage(message, { modal: true }, DialogResponses.deleteResponse, DialogResponses.cancel);
        if (result === DialogResponses.deleteResponse) {
            const deletingMessage: string = localize("removingGatewayAPI", `Removing API "${this.gatewayApiContract.name}" from gateway '${this.root.gatewayName}.'`);
            await window.withProgress({ location: ProgressLocation.Notification, title: deletingMessage }, async () => {
                const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                await apimService.deleteGatewayApi(this.root.gatewayName, nonNullProp(this.gatewayApiContract, "name"));
            });
            // don't wait
            window.showInformationMessage(localize("removedGatewayApi", `Successfully removed API "${this.gatewayApiContract.name}" from gateway '${this.root.gatewayName}'.`));

        } else {
            throw new UserCancelledError();
        }
    }
}
