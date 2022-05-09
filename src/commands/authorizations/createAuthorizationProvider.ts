/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from "../../azure/apim/ApimService";
import { IAuthorizationProviderOAuth2GrantTypesContract, IAuthorizationProviderPropertiesContract, IGrantTypesContract, ITokenStoreIdentityProviderContract } from "../../azure/apim/contracts";
import { ITokenStoreGrantTypeParameterContract } from "../../azure/apim/contracts";
import { AuthorizationProvidersTreeItem, IAuthorizationProviderTreeItemContext } from "../../explorer/AuthorizationProvidersTreeItem";
import { ServiceTreeItem } from "../../explorer/ServiceTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { askAuthorizationProviderParameterValues, askId } from "./common";

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

    const service = await apimService.getService();
    if (service.identity !== undefined) {
        const options = ['Yes', 'No'];
        const option = await ext.ui.showQuickPick(options.map((s) => { return { label: s, description: '', detail: '' }; }), { placeHolder: 'Enable System Assigned Managed Identity', canPickMany: false });
        if (option.label === options[0]) {
            window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: localize("enableManagedIdentity", `Enabling System Assigned Managed Identity.`),
                    cancellable: false
                },
                // tslint:disable-next-line:no-non-null-assertion
                async () => { return apimService.turnOnManagedIdentity(); }
            ).then(async () => {
                // tslint:disable-next-line:no-non-null-assertion
                await node!.refresh(context);
                window.showInformationMessage(localize("enabledManagedIdentity", `Enabled System Assigned Managed Identity.`));
            });
        }
    }

    let supportedIdentityProviders: ITokenStoreIdentityProviderContract[] = await apimService.listTokenStoreIdentityProviders();
    // tslint:disable-next-line:no-function-expression
    supportedIdentityProviders = supportedIdentityProviders.sort(function compare(a: ITokenStoreIdentityProviderContract, b: ITokenStoreIdentityProviderContract): number {
        return a.properties.displayName.localeCompare(b.properties.displayName);
    });

    const identityProviderPicked = await ext.ui.showQuickPick(supportedIdentityProviders.map((s) => { return { label: s.properties.displayName, description: '', detail: '' }; }), { placeHolder: 'Select Identity Provider ...', canPickMany: false });

    const selectedIdentityProvider = supportedIdentityProviders.find(s => s.properties.displayName === identityProviderPicked.label);

    let grantType: string = "";
    if (selectedIdentityProvider
        && selectedIdentityProvider.properties.oauth2.grantTypes !== null) {
        const authorizationProviderName = await askId(
            'Enter Authorization Provider name ...',
            'Invalid Authorization Provider name.');

        const grantTypes = Object.keys(selectedIdentityProvider.properties.oauth2.grantTypes);
        if (grantTypes.length > 1) {
            const grantTypePicked = await ext.ui.showQuickPick(grantTypes.map((s) => { return { label: s[0].toUpperCase() + s.slice(1), description: '', detail: '' }; }), { placeHolder: 'Select Grant Type ...', canPickMany: false });
            grantType = grantTypePicked.label[0].toLocaleLowerCase() + grantTypePicked.label.slice(1);
        } else {
            grantType = grantTypes[0];
        }

        const grantTypeValue: IGrantTypesContract = <IGrantTypesContract>grantType;

        // tslint:disable-next-line:no-any
        // tslint:disable-next-line:no-unsafe-any
        const grant: ITokenStoreGrantTypeParameterContract = selectedIdentityProvider?.properties.oauth2.grantTypes[grantType];

        const parameterValues = await askAuthorizationProviderParameterValues(grant);

        const authorizationProviderGrant: IAuthorizationProviderOAuth2GrantTypesContract = {};

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
        };

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
