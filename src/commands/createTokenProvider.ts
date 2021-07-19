/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ITokenProviderTreeItemContext, TokenProvidersTreeItem } from "../explorer/TokenProvidersTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function createTokenProvider(context: IActionContext & Partial<ITokenProviderTreeItemContext>, node?: TokenProvidersTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.tokenProvidersTreeItem;
    }

    const tokenProviderName = await askInput('Enter TokenService name ...');
    context.tokenProviderName = tokenProviderName;

    const options = ['dropbox', 'twitter', 'spotify', 'github', 'google', 'facebook', 'instagram', 'stripe', 'microsoftbot', 'visualstudioonline'];
    const identityProvider = await ext.ui.showQuickPick(options.map((s) => { return { label: s, description: '', detail: '' }; }), { placeHolder: 'Select Identity Provider ...', canPickMany: false });

    context.identityProvider = identityProvider.label;

    const clientId = await askInput('Enter Client Id ...');
    context.clientId = clientId;

    const clientSecret = await askInput('Enter Client Secret ...');
    context.clientSecret = clientSecret;

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingTokenProvider", `Creating TokenProvider '${tokenProviderName}' in API Management service ${node.root.serviceName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { return node!.createChild(context); }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("creatingTokenProvider", `Created TokenProvider '${tokenProviderName}' in API Management succesfully.`));
    });
}

async function askInput(message: string) : Promise<string> {
    const idPrompt: string = localize('value', message);
    return (await ext.ui.showInputBox({
        prompt: idPrompt,
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return value;
        }
    })).trim();
}