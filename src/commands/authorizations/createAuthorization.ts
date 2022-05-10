/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from "../../azure/apim/ApimService";
import { IAuthorizationProviderContract, IGrantTypesContract, ITokenStoreIdentityProviderContract } from "../../azure/apim/contracts";
import { AuthorizationProviderTreeItem } from "../../explorer/AuthorizationProviderTreeItem";
import { AuthorizationsTreeItem, IAuthorizationTreeItemContext } from "../../explorer/AuthorizationsTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { nonNullValue } from "../../utils/nonNull";
import { askAuthorizationParameterValues, askId, IParameterValues } from "./common";

export async function createAuthorization(context: IActionContext & Partial<IAuthorizationTreeItemContext>, node?: AuthorizationsTreeItem): Promise<void> {
    if (!node) {
        const authorizationProviderNode = <AuthorizationProviderTreeItem>await ext.tree.showTreeItemPicker(AuthorizationProviderTreeItem.contextValue, context);
        node = authorizationProviderNode.authorizationsTreeItem;
    }

    const apimService = new ApimService(
        node.root.credentials,
        node.root.environment.resourceManagerEndpointUrl,
        node.root.subscriptionId,
        node.root.resourceGroupName,
        node.root.serviceName);

    const authorizationProvider : IAuthorizationProviderContract = (<AuthorizationProviderTreeItem>node.parent).authorizationProviderContract;

    const authorizationName = await askId(
        'Enter Authorization name ...',
        'Invalid Authorization name ...'
    );

    context.authorizationName = authorizationName;

    let parameterValues: IParameterValues = {};

    let  grantType = IGrantTypesContract.authorizationCode;
    if (authorizationProvider.properties.oauth2?.grantTypes.clientCredentials) {
        grantType =  IGrantTypesContract.clientCredentials;
        const identityProvider: ITokenStoreIdentityProviderContract = await apimService.getTokenStoreIdentityProvider(authorizationProvider.properties.identityProvider);
        const grant = identityProvider.properties.oauth2.grantTypes.clientCredentials;
        parameterValues = await askAuthorizationParameterValues(nonNullValue(grant));
    }

    context.authorization = {
        authorizationType: "oauth2",
        oauth2grantType: grantType,
        parameters: parameterValues
    };

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
