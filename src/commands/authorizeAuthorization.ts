/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { window } from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationProviderContract, ITokenStoreGrantTypeParameterDefinitionContract, ITokenStoreIdentityProviderContract } from "../azure/apim/contracts";
import { AuthorizationProviderTreeItem } from "../explorer/AuthorizationProviderTreeItem";
import { AuthorizationTreeItem } from "../explorer/AuthorizationTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function authorizeAuthorization(context: IActionContext, node?: AuthorizationTreeItem): Promise<void> {
    if (!node) {
        const authorizationNode = <AuthorizationTreeItem>await ext.tree.showTreeItemPicker(AuthorizationTreeItem.contextValue, context);
        node = authorizationNode;
    }

    const extensionId = "ms-azuretools.vscode-apimanagement";
    const redirectUrl = `vscode://${extensionId}`;

    const apimService = new ApimService(node.root.credentials,
        node.root.environment.resourceManagerEndpointUrl,
        node.root.subscriptionId,
        node.root.resourceGroupName,
        node.root.serviceName);

    if (node.authorizationContract.properties.oauth2grantType == "AuthorizationCode") {
        const loginLinks = await apimService.listAuthorizationLoginLinks(
            node.root.authorizationProviderName, 
            node.authorizationContract.name,
            { postLoginRedirectUrl : redirectUrl });
    
        vscode.env.openExternal(vscode.Uri.parse(loginLinks.loginLink));
    } else if (node.authorizationContract.properties.oauth2grantType == "ClientCredentials") {
        const parameterValues: IParameterValues = {};
        const authorizationProvider : IAuthorizationProviderContract = (<AuthorizationProviderTreeItem>node.parent?.parent).authorizationProviderContract;

        const identityProvider: ITokenStoreIdentityProviderContract = await apimService.getTokenStoreIdentityProvider(authorizationProvider.properties.identityProvider);
        const grant = identityProvider.properties.oauth2.grantTypes["clientCredentials"];
        for (const parameter in grant) {
            const parameterUIMetadata = <ITokenStoreGrantTypeParameterDefinitionContract>grant[parameter];
            if (parameterUIMetadata.uidefinition.atAuthorizationProviderLevel == "HIDDEN") {
                const paramValue = await ext.ui.showInputBox({
                    placeHolder: localize('parameterDisplayName', `Enter ${parameterUIMetadata.displayName} ...`),
                    prompt: localize('parameterDescription', `${parameterUIMetadata.description}`),
                    value: parameterUIMetadata.default,
                    password: parameterUIMetadata.type == "securestring",
                    validateInput: async (value: string | undefined): Promise<string | undefined> => {
                        value = value ? value.trim() : '';

                        if (value.length < 1) {
                            return localize("parameterRequired", `${parameterUIMetadata.displayName} is required.`);
                        }

                        return undefined;
                    }
                })

                parameterValues[parameter] = paramValue;
            }
        }

        const authorization = node.authorizationContract;
        authorization.properties.parameters = parameterValues;

        window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: localize("authorizeAuthorization", `Updating Authorization '${authorization.name}' ...`),
                cancellable: false
            },
            // tslint:disable-next-line:no-non-null-assertion
            async () => { return apimService.createAuthorization(authorizationProvider.name, authorization.name, authorization.properties); }
        ).then(async () => {
            // tslint:disable-next-line:no-non-null-assertion
            await node!.refresh(context);
            window.showInformationMessage(localize("updatedAuthorization", `Updated Authorization '${authorization.name}' succesfully.`));
        });
    } 
}

interface IParameterValues {
    [key: string]: string;
}