/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperationContract } from "@azure/arm-apimanagement";
import { AzExtTreeItem, AzExtParentTreeItem } from "@microsoft/vscode-azext-utils";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { topItemCount } from "../constants";
import { localize } from "../localize";
import { treeUtils } from "../utils/treeUtils";
import { ApiOperationTreeItem } from "./ApiOperationTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";

export class ApiOperationsTreeItem extends AzExtParentTreeItem {
    public readonly root: IApiTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IApiTreeRoot) {
        super(parent);
        this.root = root;
    }

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

        let operationCollection: OperationContract[];
        operationCollection = await uiUtils.listAllIterator(
            this.root.client.apiOperation.listByApi(this.root.resourceGroupName, this.root.serviceName, this.root.apiName, { top: topItemCount })
        );

        return this.createTreeItemsWithErrorHandling(
            operationCollection,
            "invalidApiManagementApiOperation",
            async (op: OperationContract) => new ApiOperationTreeItem(this, op, this.root),
            (op: OperationContract) => {
                return op.name;
            });
    }
}
