/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzExtTreeItem, AzureParentTreeItem, ICreateChildImplContext } from "vscode-azureextensionui";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationContract, IAuthorizationPropertiesContract, IAuthorizationProviderContract, IGrantTypesContract, ITokenStoreIdentityProviderContract } from "../azure/apim/contracts";
import { askAuthorizationParameterValues, askId, IParameterValues } from "../commands/authorizations/common";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { nonNullValue } from "../utils/nonNull";
import { treeUtils } from "../utils/treeUtils";
import { AuthorizationProviderTreeItem } from "./AuthorizationProviderTreeItem";
import { AuthorizationTreeItem } from "./AuthorizationTreeItem";
import { IAuthorizationProviderTreeRoot } from "./IAuthorizationProviderTreeRoot";

export interface IAuthorizationTreeItemContext extends ICreateChildImplContext {
    authorizationName: string;
    authorization: IAuthorizationPropertiesContract;
}

export class AuthorizationsTreeItem extends AzureParentTreeItem<IAuthorizationProviderTreeRoot> {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementAuthorizations';
    public label: string = "Authorizations";
    public contextValue: string = AuthorizationsTreeItem.contextValue;
    public readonly childTypeLabel: string = localize('azureApiManagement.Authorization', 'Authorization');
    private _nextLink: string | undefined;
    private apimService: ApimService;

    public hasMoreChildrenImpl(): boolean {
        return this._nextLink !== undefined;
    }

    public async loadMoreChildrenImpl(clearCache: boolean): Promise<AzExtTreeItem[]> {
        if (clearCache) {
            this._nextLink = undefined;
        }

        this.apimService = new ApimService(
            this.root.credentials,
            this.root.environment.resourceManagerEndpointUrl,
            this.root.subscriptionId,
            this.root.resourceGroupName,
            this.root.serviceName);

        const authorizations: IAuthorizationContract[] = await this.apimService.listAuthorizations(this.root.authorizationProviderName);

        return this.createTreeItemsWithErrorHandling(
            authorizations,
            "invalidApiManagementAuthorization",
            async (authorization: IAuthorizationContract) => new AuthorizationTreeItem(this, authorization),
            (authorization: IAuthorizationContract) => {
                return authorization.name;
            });
    }

    public async createChildImpl(context: IAuthorizationTreeItemContext): Promise<AuthorizationTreeItem> {
        await this.buildContext(context);
        if (context.authorizationName !== null
            && context.authorization !== null) {
            return window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: localize("creatingAuthorization", `Creating Authorization '${context.authorizationName}' under Authorization Provider ${this.root.authorizationProviderName} ...`),
                    cancellable: false
                },
                // tslint:disable-next-line:no-non-null-assertion
                async () => {
                    const authorizationName = context.authorizationName;
                    context.showCreatingTreeItem(authorizationName);
                    try {
                        const apimService = new ApimService(this.root.credentials, this.root.environment.resourceManagerEndpointUrl, this.root.subscriptionId, this.root.resourceGroupName, this.root.serviceName);
                        const authorization = await apimService.createAuthorization(this.root.authorizationProviderName, authorizationName, context.authorization);
                        window.showInformationMessage(localize("createdAuthorization", `Created Authorization '${authorizationName}' succesfully.`));
                        return new AuthorizationTreeItem(this, authorization);
                    } catch (error) {
                        throw new Error(processError(error, localize("createAuthorization", `Failed to add authorization '${authorizationName}' to Authorization provider '${this.root.authorizationProviderName}'.`)));
                    }
                }
            );
        } else {
            throw Error("Expected Authorization name.");
        }
    }

    private async buildContext(context: IAuthorizationTreeItemContext): Promise<void> {
        const authorizationProvider: IAuthorizationProviderContract = (<AuthorizationProviderTreeItem>this.parent).authorizationProviderContract;
        const authorizationName = await askId('Enter Authorization name ...', 'Invalid Authorization name ...');
        context.authorizationName = authorizationName;
        let parameterValues: IParameterValues = {};
        let grantType = IGrantTypesContract.authorizationCode;
        if (authorizationProvider.properties.oauth2?.grantTypes.clientCredentials) {
            grantType = IGrantTypesContract.clientCredentials;
            const identityProvider: ITokenStoreIdentityProviderContract = await this.apimService.getTokenStoreIdentityProvider(authorizationProvider.properties.identityProvider);
            const grant = identityProvider.properties.oauth2.grantTypes.clientCredentials;
            parameterValues = await askAuthorizationParameterValues(nonNullValue(grant));
        }
        context.authorization = { authorizationType: "oauth2", oauth2grantType: grantType, parameters: parameterValues };
    }
}
