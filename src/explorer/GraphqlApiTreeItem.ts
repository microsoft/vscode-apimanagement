/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureParentTreeItem, AzureTreeItem, ISubscriptionContext } from "vscode-azureextensionui";
import { IApiContract } from "../azure/apim/TempApiContract";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { ApiPolicyTreeItem } from "./ApiPolicyTreeItem";
import { IApiTreeRoot } from "./IApiTreeRoot";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export class GraphqlApiTreeItem extends AzureParentTreeItem<IApiTreeRoot> {
    public static contextValue: string = 'azureApiManagementGraphql';
    public contextValue: string = GraphqlApiTreeItem.contextValue;
    public readonly commandId: string = 'azureApiManagement.showArmApi';
    public policyTreeItem: ApiPolicyTreeItem;

    private _name: string;
    private _label: string;
    private _root: IApiTreeRoot;

    constructor(
        parent: AzureParentTreeItem,
        public apiContract: IApiContract,
        apiVersion?: string) {
        super(parent);

        if (!apiVersion) {
            const label = nonNullProp(this.apiContract.properties, 'displayName');
            this._label = label.concat(" (GraphqlAPI)");
        } else {
            this._label = apiVersion.concat(" (GraphqlAPI)");
        }

        this._name = nonNullProp(this.apiContract, 'name');
        this._root = this.createRoot(parent.root, this._name, this.apiContract.properties.type);
        this.policyTreeItem = new ApiPolicyTreeItem(this);
    }

    public get id(): string {
        return this._label;
    }

    public get label(): string {
        return this._label;
    }

    public get root(): IApiTreeRoot {
        return this._root;
    }

    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('api');
    }

    public async loadMoreChildrenImpl(): Promise<AzureTreeItem<IApiTreeRoot>[]> {
        return [this.policyTreeItem];
    }
    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    private createRoot(subRoot: ISubscriptionContext, apiName: string, apiType: string): IApiTreeRoot {
        return Object.assign({}, <IServiceTreeRoot>subRoot, {
            apiName: apiName,
            apiType: apiType
        });
    }
}
