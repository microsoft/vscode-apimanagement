/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { AuthorizationTreeItem } from "../../explorer/AuthorizationTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';

export async function copyAuthorizationPolicy(context: IActionContext, node?: AuthorizationTreeItem): Promise<void> {
    if (!node) {
        const authorizationNode = <AuthorizationTreeItem>await ext.tree.showTreeItemPicker(AuthorizationTreeItem.contextValue, context);
        node = authorizationNode;
    }

    // Select purpose
    const attachToken = "Attach access token to backend request";
    const tokenBack = "Retrieve access token";
    const purposeOptions = [attachToken, tokenBack];
    const purposeSelected = await ext.ui.showQuickPick(
        purposeOptions.map(purpose => { return { label: purpose, description: '', detail: '' }; }),
        { placeHolder: 'How do you want to use the policy?', canPickMany: false });
    const managed = "managed";
    const jwt = "jwt";
    const identityTypeOptions = [
        {
            label: managed,
            description: "Use the managed identity of the service."
        },
        {
            label: jwt,
            description: "Use the identity of the specified token."
        }
    ];
    const identityTypeSelected = await ext.ui.showQuickPick(
        identityTypeOptions.map(option => { return { label: option.label, description: option.description, detail: '' }; }),
        { placeHolder: 'Which identity type do you want to use?', canPickMany: false, suppressPersistence: true });

    const pid = node.root.authorizationProviderName;
    const aid = node.authorizationContract.name;

    let comment = '';
    let identityPhrase = '';
    let additionalMessage = '';
    if (identityTypeSelected.label === managed) {
        comment = `<!-- Add to the inbound policy -->`;
        identityPhrase = `identity-type="${identityTypeSelected.label}"`;
        additionalMessage = "For 'managed' identity-type, make sure managed identity is turned on.";
    } else {
        const allowedAudienceMessage = `Allowed audiences for jwt in "identity" attribute are "https://azure-api.net/authorization-manager"`;
        comment = `<!-- Add to the inbound policy. ${allowedAudienceMessage} -->`;
        identityPhrase = `identity-type="${identityTypeSelected.label}" identity="@(context.Request.Headers["Authorization"][0].Replace("Bearer ", ""))"`;
        additionalMessage = `For 'jwt' identity-type, ${allowedAudienceMessage}`;
    }

    let policy = '';
    if (purposeSelected.label === attachToken) {
        policy = `${comment}
<get-authorization-context
    provider-id="${pid}"
    authorization-id="${aid}"
    context-variable-name="${pid}-${aid}-context"
    ignore-error="false"
    ${identityPhrase} />
<set-header name="Authorization" exists-action="override">
    <value>@("Bearer " + ((Authorization)context.Variables.GetValueOrDefault("${pid}-${aid}-context"))?.AccessToken)</value>
</set-header>`;
    } else {
        policy = `${comment}
<get-authorization-context
    provider-id="${pid}"
    authorization-id="${aid}"
    context-variable-name="${pid}-${aid}-context"
    ignore-error="false"
    ${identityPhrase} />
<return-response>
    <set-status code="200" />
    <set-body template="none">@(((Authorization)context.Variables.GetValueOrDefault("${pid}-${aid}-context"))?.AccessToken)</set-body>
</return-response>`;
    }

    vscode.env.clipboard.writeText(policy);
    vscode.window.showInformationMessage(localize("CopySnippet", `Policy copied to clipboard. ${additionalMessage}`));
    ext.outputChannel.appendLine(`Policy copied to clipboard. ${additionalMessage}`);
}
