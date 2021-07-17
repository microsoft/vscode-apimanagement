/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureParentTreeItem, AzureTreeItem, ISubscriptionContext } from "vscode-azureextensionui";
import { ITokenProviderContract } from "../azure/apim/contracts";
import { nonNullProp } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { ConnectionsTreeItem } from "./ConnectionsTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";
import { ITokenProviderTreeRoot } from "./ITokenProviderTreeRoot";
import { TokenProvidersTreeItem } from "./TokenProvidersTreeItem";

export class TokenProviderTreeItem extends AzureParentTreeItem<ITokenProviderTreeRoot> {
    public static contextValue: string = 'azureApiManagementTokenProviderTreeItem';
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

    private createRoot(subRoot: ISubscriptionContext): ITokenProviderTreeRoot {
        return Object.assign({}, <IServiceTreeRoot>subRoot, {
            tokenProviderName: nonNullProp(this.tokenProviderContract, 'name')
        });
    }
}
