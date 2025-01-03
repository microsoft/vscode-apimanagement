/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, ApiVersionSetContractDetails } from "@azure/arm-apimanagement/src/models";
import { AzExtParentTreeItem, AzExtTreeItem } from "@microsoft/vscode-azext-utils";
import { nonNullProp, nonNullValue } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { ApiTreeItem } from "./ApiTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class ApiVersionSetTreeItem extends AzExtParentTreeItem {
    public static contextValue: string = 'azureApiManagementApiVersionSet';
    public contextValue: string = ApiVersionSetTreeItem.contextValue;

    public readonly root: IServiceTreeRoot;

    private _apis: ApiContract[] = [];
    private _apiVersionSet: ApiVersionSetContractDetails;

    constructor(
        parent: AzExtParentTreeItem,
        root: IServiceTreeRoot,
        public readonly initialApi: ApiContract) {
        super(parent);
        this.root = root;
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

    public async loadMoreChildrenImpl(): Promise<AzExtTreeItem[]> {
        const apis = this._apis.map(async (api) => new ApiTreeItem(this, api, this.root, api.apiVersion ? api.apiVersion : "Original"));
        return Promise.all(apis);
    }

    public addApiToSet(api: ApiContract) : void {
        this._apis.push(api);
    }
}
