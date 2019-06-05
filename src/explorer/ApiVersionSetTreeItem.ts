/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, ApiVersionSetContractDetails } from "azure-arm-apimanagement/lib/models";
import { AzureParentTreeItem, AzureTreeItem } from "vscode-azureextensionui";
import { nonNullProp, nonNullValue } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { ApiTreeItem } from "./ApiTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class ApiVersionSetTreeItem extends AzureParentTreeItem<IServiceTreeRoot> {
    public static contextValue: string = 'azureApiManagementApiVersionSet';
    public contextValue: string = ApiVersionSetTreeItem.contextValue;

    private _apis: ApiContract[] = [];
    private _apiVersionSet: ApiVersionSetContractDetails;

    constructor(
        parent: AzureParentTreeItem,
        public readonly initialApi: ApiContract) {
        super(parent);
        this._apis.push(initialApi);

        this._apiVersionSet = nonNullValue(initialApi, "apiVersionSet");
        this.id = `${this._apiVersionSet.id}-vs`;
    }

    public get label() : string {
        return nonNullProp(this._apiVersionSet, "name");
    }

    public get description() : string {
        return 'Version Set';
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IServiceTreeRoot>[]> {
        const apis = this._apis.map(async (api) => new ApiTreeItem(this, api, api.apiVersion ? api.apiVersion : "Original"));
        return Promise.all(apis);
    }

    public addApiToSet(api: ApiContract) : void {
        this._apis.push(api);
    }
}
