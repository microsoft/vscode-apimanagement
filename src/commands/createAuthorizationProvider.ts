/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IGrantTypesContract, ITokenStoreIdentityProviderContract } from "../azure/apim/contracts";
import { AuthorizationProvidersTreeItem, IAuthorizationProviderTreeItemContext } from "../explorer/AuthorizationProvidersTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";

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
    supportedIdentityProviders = supportedIdentityProviders.sort(function(a,b){
        return a.properties.displayName.localeCompare(b.properties.displayName);
    });
    
    const identityProviderPicked = await ext.ui.showQuickPick(supportedIdentityProviders.map((s) => { return { label: s.properties.displayName, description: '', detail: '' }; }), { placeHolder: 'Select Identity Provider ...', canPickMany: false });

    const selectedIdentityProvider = supportedIdentityProviders.find(s => s.properties.displayName === identityProviderPicked.label);

    let grantType: IGrantTypesContract = IGrantTypesContract.authorizationCode;
    if (selectedIdentityProvider 
        && selectedIdentityProvider.properties.oauth2.grantTypes)
    {
        const grantTypes = Object.keys(selectedIdentityProvider.properties.oauth2.grantTypes)
        if (grantTypes.length > 1) {
            const grantTypePicked =  await ext.ui.showQuickPick(grantTypes.map((s) => { return { label: s[0].toUpperCase() + s.slice(1), description: '', detail: '' }; }), { placeHolder: 'Select Grant Type ...', canPickMany: false });
            grantType =  <IGrantTypesContract> grantTypePicked.label;
        } else {
            grantType =  <IGrantTypesContract> grantTypes[0];
        }
    }
    
    window.showInformationMessage(grantType);
}