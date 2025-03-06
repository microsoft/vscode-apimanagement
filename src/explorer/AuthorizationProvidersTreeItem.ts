/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, ICreateChildImplContext, IActionContext } from "@microsoft/vscode-azext-utils";
import { ApimService } from "../azure/apim/ApimService";
import { IAuthorizationProviderContract, IAuthorizationProviderOAuth2GrantTypesContract, IAuthorizationProviderPropertiesContract, IGrantTypesContract, ITokenStoreGrantTypeParameterContract, ITokenStoreIdentityProviderContract } from "../azure/apim/contracts";
import { askAuthorizationProviderParameterValues, askId } from "../commands/authorizations/common";
import { ext } from "../extensionVariables";
import { localize } from "../localize";
import { processError } from "../utils/errorUtil";
import { treeUtils } from "../utils/treeUtils";
import { AuthorizationProviderTreeItem } from "./AuthorizationProviderTreeItem";
import { IServiceTreeRoot } from "./IServiceTreeRoot";

export interface IAuthorizationProviderTreeItemContext extends ICreateChildImplContext {
    name: string;
    authorizationProvider: IAuthorizationProviderPropertiesContract;
}

export class AuthorizationProvidersTreeItem extends AzExtParentTreeItem {
    public get iconPath(): { light: string, dark: string } {
        return treeUtils.getThemedIconPath('list');
    }
    public static contextValue: string = 'azureApiManagementAuthorizationProviders';
    public readonly childTypeLabel: string = localize('azureApiManagement.AuthorizationProvider', 'Credential Manager');
    public label: string = "Credential Managers (preview)";
    public contextValue: string = AuthorizationProvidersTreeItem.contextValue;
    private _nextLink: string | undefined;
    private apimService: ApimService;
    public readonly root: IServiceTreeRoot;

    constructor(parent: AzExtParentTreeItem, root: IServiceTreeRoot) {
        super(parent);
        this.root = root;
    }

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

        const tokenProviders: IAuthorizationProviderContract[] = await this.apimService.listAuthorizationProviders();

        return this.createTreeItemsWithErrorHandling(
            tokenProviders,
            "invalidApiManagementAuthorizationProvider",
            async (authorizationProvider: IAuthorizationProviderContract) => new AuthorizationProviderTreeItem(this, authorizationProvider, this.root),
            (authorizationProvider: IAuthorizationProviderContract) => {
                return authorizationProvider.name;
            });
    }

    public async createChildImpl(context: IAuthorizationProviderTreeItemContext): Promise<AuthorizationProviderTreeItem> {
        await this.checkManagedIdentityEnabled(context);
        await this.buildContext(context);
        if (context.name !== null && context.authorizationProvider !== null) {
            return window.withProgress(
                {
                    location: ProgressLocation.Notification,
                    title: localize("creatingAuthorizationProvider", `Creating Credential Manager '${context.name}' in service ${this.root.serviceName} ...`),
                    cancellable: false
                },
                // tslint:disable-next-line:no-non-null-assertion
                async (): Promise<AuthorizationProviderTreeItem> => {
                    const authorizationProviderName = context.name;
                    context.showCreatingTreeItem(authorizationProviderName);
                    try {
                        let authorizationProvider = await this.apimService.getAuthorizationProvider(context.name);
                        if (authorizationProvider === undefined) {
                            authorizationProvider = await this.apimService.createAuthorizationProvider(context.name, context.authorizationProvider);
                            const message = `Please add redirect url '${authorizationProvider.properties.oauth2?.redirectUrl}' to the OAuth application.`;
                            ext.outputChannel.show();
                            ext.outputChannel.appendLine(message);
                            window.showWarningMessage(localize("redirectUrlMessage", message));
                            window.showInformationMessage(localize("createdAuthorizationProvider", `Created Credential Manager '${context.name}'.`));
                            return new AuthorizationProviderTreeItem(this, authorizationProvider, this.root);
                        } else {
                            throw new Error(localize("createAuthorizationProvider", `Credential Manager '${authorizationProviderName}' already exists.`));
                        }
                    } catch (error) {
                        throw new Error(processError(error, localize("createAuthorizationProvider", `Failed to create Credential Manager '${authorizationProviderName}'.`)));
                    }
                }
            );
        } else {
            throw Error("Expected Authorization provider information.");
        }
    }

    private async checkManagedIdentityEnabled(context: IActionContext): Promise<void> {
        const service = await this.apimService.getService();
        if (service.identity === undefined) {
            const options = ['Yes', 'No'];
            const option = await context.ui.showQuickPick(options.map((s) => { return { label: s, description: '', detail: '' }; }), { placeHolder: 'Enable system assigned managed identity', canPickMany: false });
            if (option.label === options[0]) {
                await window.withProgress(
                    {
                        location: ProgressLocation.Notification,
                        title: localize("enableManagedIdentity", `Enabling system assigned managed identity.`),
                        cancellable: false
                    },
                    async () => {
                        await this.apimService.turnOnManagedIdentity();
                        window.showInformationMessage(localize("enabledManagedIdentity", `Enabled system assigned managed identity.`));
                    }
                );
            }
        }
    }

    private async buildContext(context: IAuthorizationProviderTreeItemContext): Promise<void> {
        let supportedIdentityProviders: ITokenStoreIdentityProviderContract[] = await this.apimService.listTokenStoreIdentityProviders();
        // tslint:disable-next-line:no-function-expression
        supportedIdentityProviders = supportedIdentityProviders.sort(function compare(a: ITokenStoreIdentityProviderContract, b: ITokenStoreIdentityProviderContract): number {
            return a.properties.displayName.localeCompare(b.properties.displayName);
        });

        const identityProviderPicked = await context.ui.showQuickPick(supportedIdentityProviders.map((s) => { return { label: s.properties.displayName, description: '', detail: '' }; }), { placeHolder: 'Select identity provider ...', canPickMany: false });
        const selectedIdentityProvider = supportedIdentityProviders.find(s => s.properties.displayName === identityProviderPicked.label);

        let grantType: string = "";
        if (selectedIdentityProvider
            && selectedIdentityProvider.properties.oauth2.grantTypes !== null) {
            const authorizationProviderName = await askId(context,
                'Enter Credential Manager name ...',
                'Invalid Credential Manager name.');

            const grantTypes = Object.keys(selectedIdentityProvider.properties.oauth2.grantTypes);
            if (grantTypes.length > 1) {
                const grantTypePicked = await context.ui.showQuickPick(grantTypes.map((s) => { return { label: s[0].toUpperCase() + s.slice(1), description: '', detail: '' }; }), { placeHolder: 'Select grant type ...', canPickMany: false });
                grantType = grantTypePicked.label[0].toLocaleLowerCase() + grantTypePicked.label.slice(1);
            } else {
                grantType = grantTypes[0];
            }

            const grantTypeValue: IGrantTypesContract = <IGrantTypesContract>grantType;

            // tslint:disable-next-line:no-any
            // tslint:disable-next-line:no-unsafe-any
            const grant: ITokenStoreGrantTypeParameterContract = selectedIdentityProvider?.properties.oauth2.grantTypes[grantType];

            const parameterValues = await askAuthorizationProviderParameterValues(context, grant);

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
        }
    }
}
