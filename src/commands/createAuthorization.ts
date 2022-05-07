/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationProviderContract, IGrantTypesContract, ITokenStoreGrantTypeParameterDefinitionContract, ITokenStoreIdentityProviderContract } from "../azure/apim/contracts";
import { AuthorizationProviderTreeItem } from "../explorer/AuthorizationProviderTreeItem";
import { AuthorizationsTreeItem, IAuthorizationTreeItemContext } from "../explorer/AuthorizationsTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function createAuthorization(context: IActionContext & Partial<IAuthorizationTreeItemContext>, node?: AuthorizationsTreeItem): Promise<void> {
    if (!node) {
        const authorizationProviderNode = <AuthorizationProviderTreeItem>await ext.tree.showTreeItemPicker(AuthorizationProviderTreeItem.contextValue, context);
        node = authorizationProviderNode.authorizationsTreeItem;
    }

    const apimService = new ApimService(node.root.credentials,
        node.root.environment.resourceManagerEndpointUrl,
        node.root.subscriptionId,
        node.root.resourceGroupName,
        node.root.serviceName);

    const authorizationProvider : IAuthorizationProviderContract = (<AuthorizationProviderTreeItem>node.parent).authorizationProviderContract;
    
    const authorizationName = await askId();
    context.authorizationName = authorizationName;

    const parameterValues: IParameterValues = {};

    let  grantType = IGrantTypesContract.authorizationCode;
    if (authorizationProvider.properties.oauth2?.grantTypes.clientCredentials) {
        grantType =  IGrantTypesContract.clientCredentials;
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
    }

    context.authorization = {
        authorizationType: "oauth2",
        oauth2grantType: grantType,
        parameters: parameterValues
    }

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingAuthorization", `Creating Authorization '${authorizationName}' under Authorization Provider ${authorizationProvider.name} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { return node!.createChild(context); }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("creatingAuthorization", `Created Authorization '${authorizationName}' succesfully.`));
    });
}

// Reduntant code - refactor
async function askId(defaultValue: string = ''): Promise<string> {
    const idPrompt: string = localize('idPrompt', 'Enter Authorization name ...');
    return (await ext.ui.showInputBox({
        prompt: idPrompt,
        value: defaultValue,
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return validateId(value);
        }
    })).trim();
}

function validateId(id: string): string | undefined {
    const test = "^[\w]+$)|(^[\w][\w\-]+[\w]$";
    if (id.match(test) === null) {
        return localize("idInvalid", 'Invalid Authorization name.');
    }

    return undefined;
}

interface IParameterValues {
    [key: string]: string;
}