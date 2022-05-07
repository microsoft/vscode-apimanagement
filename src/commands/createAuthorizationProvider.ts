/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationProviderOAuth2GrantTypesContract, IAuthorizationProviderPropertiesContract, IGrantTypesContract, ITokenStoreGrantTypeParameterDefinitionContract, ITokenStoreIdentityProviderContract } from "../azure/apim/contracts";
import { AuthorizationProvidersTreeItem, IAuthorizationProviderTreeItemContext } from "../explorer/AuthorizationProvidersTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function createAuthorizationProvider(context: IActionContext & Partial<IAuthorizationProviderTreeItemContext>, node?: AuthorizationProvidersTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.authorizationProvidersTreeItem;
    }

    const apimService = new ApimService(node.root.credentials,
        node.root.environment.resourceManagerEndpointUrl,
        node.root.subscriptionId,
        node.root.resourceGroupName,
        node.root.serviceName);

    let supportedIdentityProviders: ITokenStoreIdentityProviderContract[] = await apimService.listTokenStoreIdentityProviders();
    supportedIdentityProviders = supportedIdentityProviders.sort(function (a, b) {
        return a.properties.displayName.localeCompare(b.properties.displayName);
    });

    const identityProviderPicked = await ext.ui.showQuickPick(supportedIdentityProviders.map((s) => { return { label: s.properties.displayName, description: '', detail: '' }; }), { placeHolder: 'Select Identity Provider ...', canPickMany: false });

    const selectedIdentityProvider = supportedIdentityProviders.find(s => s.properties.displayName === identityProviderPicked.label);

    let grantType: string = "";
    if (selectedIdentityProvider
        && selectedIdentityProvider.properties.oauth2.grantTypes) {
        const authorizationProviderName = await askId(selectedIdentityProvider.name);

        const grantTypes = Object.keys(selectedIdentityProvider.properties.oauth2.grantTypes)
        if (grantTypes.length > 1) {
            const grantTypePicked = await ext.ui.showQuickPick(grantTypes.map((s) => { return { label: s[0].toUpperCase() + s.slice(1), description: '', detail: '' }; }), { placeHolder: 'Select Grant Type ...', canPickMany: false });
            grantType = grantTypePicked.label[0].toLocaleLowerCase() + grantTypePicked.label.slice(1);
        } else {
            grantType = grantTypes[0];
        }

        const grantTypeValue: IGrantTypesContract = <IGrantTypesContract>grantType;

        const grant: ITokenStoreGrantTypeParameterDefinitionContract = selectedIdentityProvider?.properties.oauth2.grantTypes[grantType];

        const parameterValues: IParameterValues = {};
        for (const parameter in grant) {
            const parameterUIMetadata = <ITokenStoreGrantTypeParameterDefinitionContract>grant[parameter];
            if (parameterUIMetadata.uidefinition.atAuthorizationProviderLevel != "HIDDEN") {
                const paramValue = await ext.ui.showInputBox({
                    placeHolder: localize('parameterDisplayName', `Enter ${parameterUIMetadata.displayName} ...`),
                    prompt: localize('parameterDescription', `${parameterUIMetadata.description}`),
                    value: parameterUIMetadata.default,
                    password: parameterUIMetadata.type == "securestring",
                    validateInput: async (value: string | undefined): Promise<string | undefined> => {
                        value = value ? value.trim() : '';

                        if (parameterUIMetadata.uidefinition.atAuthorizationProviderLevel == "REQUIRED" && value.length < 1) {
                            return localize("parameterRequired", `${parameterUIMetadata.displayName} is required.`);
                        }

                        return undefined;
                    }
                })

                parameterValues[parameter] = paramValue;
            }
        }

        const authorizationProviderGrant: IAuthorizationProviderOAuth2GrantTypesContract = {}

        if (grantTypeValue === IGrantTypesContract.authorizationCode) {
            authorizationProviderGrant.authorizationCode = parameterValues;
        } else if (grantTypeValue === IGrantTypesContract.clientCredentials) {
            authorizationProviderGrant.clientCredentials = parameterValues;
        }

        const authorizationProviderPayload: IAuthorizationProviderPropertiesContract = {
            identityProvider: selectedIdentityProvider.name,
            oauth2: {
                grantTypes: authorizationProviderGrant
            }
        }

        context.name = authorizationProviderName;
        context.authorizationProvider = authorizationProviderPayload;

        window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: localize("creatingAuthorizationProvider", `Creating Authorization Provider '${authorizationProviderName}' in API Management service ${node.root.serviceName} ...`),
                cancellable: false
            },
            // tslint:disable-next-line:no-non-null-assertion
            async () => { return node!.createChild(context); }
        ).then(async () => {
            // tslint:disable-next-line:no-non-null-assertion
            await node!.refresh(context);
            window.showInformationMessage(localize("creatingAuthorizationProvider", `Created Authorization Provider '${authorizationProviderName}' in API Management succesfully.`));
        });
    }
}

async function askId(defaultValue: string): Promise<string> {
    const idPrompt: string = localize('idPrompt', 'Enter Authorization Provider name ...');
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
        return localize("idInvalid", 'Invalid Authorization Provider name.');
    }

    return undefined;
}

interface IParameterValues {
    [key: string]: string;
}