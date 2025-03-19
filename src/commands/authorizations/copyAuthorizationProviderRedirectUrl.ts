/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { AuthorizationProviderTreeItem } from '../../explorer/AuthorizationProviderTreeItem';
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { nonNullValue } from '../../utils/nonNull';

export async function copyAuthorizationProviderRedirectUrl(context: IActionContext, node?: AuthorizationProviderTreeItem): Promise<void> {
    if (!node) {
        node = <AuthorizationProviderTreeItem>await ext.tree.showTreeItemPicker(AuthorizationProviderTreeItem.contextValue, context);
    }

    const redirectUrl = nonNullValue(node.authorizationProviderContract.properties.oauth2?.redirectUrl);
    vscode.env.clipboard.writeText(redirectUrl);
    vscode.window.showInformationMessage(localize("copyRedirect", `RedirectUrl for Credential Manager '${node.authorizationProviderContract.name}' copied to clipboard. value - ${redirectUrl}`));
    ext.outputChannel.appendLine(`RedirectUrl for Credential Manager '${node.authorizationProviderContract.name}' copied to clipboard. value - ${redirectUrl}`);
}
