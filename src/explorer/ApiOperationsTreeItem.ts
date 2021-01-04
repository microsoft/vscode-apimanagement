/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { AzExtTreeItem, AzureParentTreeItem } from "vscode-azureextensionui";
import { topItemCount } from "../constants";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { ApiOperationTreeItem } from "./ApiOperationTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";

export class ApiOperationsTreeItem extends AzureParentTreeItem<IApiTreeRoot> {
    // @ts-ignore
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementOperations';
    public label: string = "Operations";
    public contextValue: string = ApiOperationsTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.Operation', 'Operation');
    private _nextLink: string | undefined;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        const operationCollection: ApiManagementModels.OperationCollection = this._nextLink === undefined ?
            await this.root.client.apiOperation.listByApi(this.root.resourceGroupName, this.root.serviceName, this.root.apiName, {top: topItemCount}) :
            await this.root.client.apiOperation.listByApiNext(this._nextLink);

        // tslint:disable-next-line: no-unsafe-any
        this._nextLink = operationCollection.nextLink;

        return this.createTreeItemsWithErrorHandling(
            operationCollection,
            "invalidApiManagementApiOperation",
            async (op: ApiManagementModels.OperationContract) => new ApiOperationTreeItem(this, op),
            (op: ApiManagementModels.OperationContract) => {
                return op.name;
            });

    }
}
