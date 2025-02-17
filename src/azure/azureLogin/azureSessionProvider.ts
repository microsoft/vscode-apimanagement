// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import {
    AuthenticationGetSessionOptions,
    AuthenticationSession,
    Event,
    EventEmitter,
    ExtensionContext,
    Disposable as VsCodeDisposable,
    authentication,
    l10n
} from "vscode";
import { UiStrings } from "../../uiStrings";
import { GeneralUtils } from "../../utils/generalUtils";
import { AzureAuthenticationSession, AzureSessionProvider, GetAuthSessionOptions, SignInStatus, Tenant } from "./authTypes";
import { AzureAccount } from "./azureAccount";
import { AzureAuth } from "./azureAuth";
import { AzureLoginConstantString } from "./constants";

enum AuthScenario {
    Initialization,
    SignIn,
    GetSession,
}

export namespace AzureSessionProviderHelper {

    let sessionProvider: AzureSessionProvider;

    export function activateAzureSessionProvider(context: ExtensionContext) {
        sessionProvider = new AzureSessionProviderImpl();
        context.subscriptions.push(sessionProvider);
    }

    export function getSessionProvider(): AzureSessionProvider {
        return sessionProvider;
    }

    class AzureSessionProviderImpl extends VsCodeDisposable implements AzureSessionProvider {
        private readonly initializePromise: Promise<void>;
        private handleSessionChanges: boolean = true;
        private tenants: Tenant[] = [];
        private selectedTenantValue: Tenant | null = null;

        public readonly onSignInStatusChangeEmitter = new EventEmitter<SignInStatus>();
        public signInStatusValue: SignInStatus = SignInStatus.Initializing;

        public constructor() {
            const disposable = authentication.onDidChangeSessions(async (e) => {
                // Ignore events for non-microsoft providers
                if (e.provider.id !== AzureAuth.getConfiguredAuthProviderId()) {
                    return;
                }

                // Ignore events that we triggered.
                if (!this.handleSessionChanges) {
                    return;
                }

                // Silently check authentication status and tenants
                await this.signInAndUpdateTenants(AuthScenario.Initialization);
            });

            super(() => {
                this.onSignInStatusChangeEmitter.dispose();
                disposable.dispose();
            });

            this.initializePromise = this.initialize();
        }

        public get signInStatus(): SignInStatus {
            return this.signInStatusValue;
        }

        public get signInStatusChangeEvent(): Event<SignInStatus> {
            return this.onSignInStatusChangeEmitter.event;
        }

        public get availableTenants(): Tenant[] {
            return [...this.tenants];
        }

        public get selectedTenant(): Tenant | null {
            return this.selectedTenantValue;
        }

        public set selectedTenant(tenant: Tenant | null) {
            const isValid = tenant === null || this.tenants.some((t) => t.id === tenant.id);
            const isChanged = this.selectedTenantValue !== tenant;
            if (isValid && isChanged) {
                this.selectedTenantValue = tenant;
                this.onSignInStatusChangeEmitter.fire(this.signInStatusValue);
            }
        }

        private async initialize(): Promise<void> {
            await this.signInAndUpdateTenants(AuthScenario.Initialization);
        }

        /**
         * Sign in to Azure interactively, i.e. prompt the user to sign in even if they have an active session.
         * This allows the user to choose a different account or tenant.
         */
        public async signIn(): Promise<void> {
            await this.initializePromise;

            const newSignInStatus = SignInStatus.SigningIn;
            if (newSignInStatus !== this.signInStatusValue) {
                this.signInStatusValue = newSignInStatus;
                this.onSignInStatusChangeEmitter.fire(this.signInStatusValue);
            }

            await this.signInAndUpdateTenants(AuthScenario.SignIn);
        }

        private async signInAndUpdateTenants(authScenario: AuthScenario): Promise<void> {
            // Initially, try to get a session using the 'organizations' tenant/authority:
            // https://learn.microsoft.com/en-us/entra/identity-platform/msal-client-application-configuration#authority
            // This allows the user to sign in to the Microsoft provider and list tenants,
            // but the resulting session will not allow tenant-level operations. For that,
            // we need to get a session for a specific tenant.
            const orgTenantId = AzureLoginConstantString.organizations;
            const scopes = AzureAuth.getScopes(orgTenantId, {});
            const getSessionResult = await this.getArmSession(orgTenantId, scopes, authScenario);

            // Get the tenants
            const getTenantsResult = await GeneralUtils.bindAsync(getSessionResult, (session) => AzureAccount.getTenants(session));
            const newTenants = GeneralUtils.succeeded(getTenantsResult) ? getTenantsResult.result : [];
            const tenantsChanged = AzureAccount.getIdString(newTenants) !== AzureAccount.getIdString(this.tenants);

            // Determine which tenant should be selected. We can't force the user to choose at this stage,
            // so this can be null, and will be set when the user tries to get a session.
            const newSelectedTenant = await this.getNewSelectedTenant(newTenants, this.selectedTenantValue, authScenario);
            const selectedTenantChanged = newSelectedTenant?.id !== this.selectedTenantValue?.id;

            // Get the overall sign-in status. If the user has access to any tenants they are signed in.
            const newSignInStatus = newTenants.length > 0 ? SignInStatus.SignedIn : SignInStatus.SignedOut;
            const signInStatusChanged = newSignInStatus !== this.signInStatusValue;

            // Update the state and fire event if anything has changed.
            this.selectedTenantValue = newSelectedTenant;
            this.tenants = newTenants;
            this.signInStatusValue = newSignInStatus;
            if (signInStatusChanged || tenantsChanged || selectedTenantChanged) {
                if (newSignInStatus === SignInStatus.SignedOut) {
                    await AzureAccount.updateSelectedTenant();
                }
                this.onSignInStatusChangeEmitter.fire(this.signInStatusValue);
            }
        }

        /**
         * Get the current Azure session, silently if possible.
         * @returns The current Azure session, if available. If the user is not signed in, or there are no tenants,
         * an error message is returned.
         */
        public async getAuthSession(options?: GetAuthSessionOptions): Promise<GeneralUtils.Errorable<AzureAuthenticationSession>> {
            await this.initializePromise;
            if (this.signInStatusValue !== SignInStatus.SignedIn) {
                return { succeeded: false, error: l10n.t(UiStrings.NotSignInStatus, this.signInStatusValue) };
            }

            if (this.tenants.length === 0) {
                return { succeeded: false, error: UiStrings.NoTenantFound };
            }

            if (!this.selectedTenantValue) {
                if (this.tenants.length > 1) {
                    const selectedTenant = await AzureAuth.quickPickTenant(this.tenants);
                    if (!selectedTenant) {
                        return { succeeded: false, error: UiStrings.NoTenantSelected };
                    }

                    this.selectedTenantValue = selectedTenant;
                } else {
                    this.selectedTenantValue = this.tenants[0];
                }
            }

            // Get a session for a specific tenant.
            const tenantId = this.selectedTenantValue.id;
            const scopes = AzureAuth.getScopes(tenantId, options || {});
            return await this.getArmSession(tenantId, scopes, AuthScenario.GetSession);
        }

        private async getNewSelectedTenant(
            newTenants: Tenant[],
            currentSelectedTenant: Tenant | null,
            authScenario: AuthScenario,
        ): Promise<Tenant | null> {
            // For sign-in we ignore the current selected tenant because the user must be able to change it.
            // For all other scenarios, we prefer to retain the current selected tenant if it is still valid.
            const ignoreCurrentSelection = authScenario === AuthScenario.SignIn;
            if (!ignoreCurrentSelection && currentSelectedTenant !== null) {
                const isCurrentSelectedTenantValid = newTenants.some((t) => t.id === currentSelectedTenant.id);
                if (isCurrentSelectedTenantValid) {
                    return currentSelectedTenant;
                }
            }

            // For sign-in, if there are multiple tenants, we should prompt the user to select one.
            if (authScenario === AuthScenario.SignIn && newTenants.length > 1) {
                return null;
            }

            // For all other (non-interactive) scenarios, see if we can determine a default tenant to use.
            const defaultTenant = await this.getDefaultTenantId(newTenants);
            return defaultTenant;
        }

        private async getDefaultTenantId(tenants: Tenant[]): Promise<Tenant | null> {
            if (tenants.length === 1) {
                return tenants[0];
            }

            // It may be the case that the user has access to multiple tenants, but only has a valid token for one of them.
            // This might happen if the user has signed in to one recently, but not the others. In this case, we would want
            // to default to the tenant that the user has a valid token for.
            // Use the 'Initialization' scenario to ensure this is silent (no user interaction).
            const getSessionPromises = tenants.map((t) =>
                this.getArmSession(t.id, AzureAuth.getScopes(t.id, {}), AuthScenario.Initialization),
            );
            const results = await Promise.all(getSessionPromises);
            const accessibleTenants = results.filter(GeneralUtils.succeeded).map((r) => r.result);
            if (accessibleTenants.length === 1) {
                return AzureAccount.findTenant(tenants, accessibleTenants[0].tenantId);
            }
            const lastTenant = AzureAccount.getSelectedTenant();
            return lastTenant && accessibleTenants.some(item => item.tenantId === lastTenant.id) ? lastTenant : null;
        }

        private async getArmSession(
            tenantId: string,
            scopes: string[],
            authScenario: AuthScenario,
        ): Promise<GeneralUtils.Errorable<AzureAuthenticationSession>> {
            this.handleSessionChanges = false;
            try {
                let options: AuthenticationGetSessionOptions;
                let silentFirst = false;
                switch (authScenario) {
                    case AuthScenario.Initialization:
                        options = { createIfNone: false, clearSessionPreference: false, silent: true };
                        break;
                    case AuthScenario.SignIn:
                        options = { createIfNone: true, clearSessionPreference: true, silent: false };
                        break;
                    case AuthScenario.GetSession:
                        // the 'createIfNone' option cannot be used with 'silent', but really we want both
                        // flags here (i.e. create a session silently, but do create one if it doesn't exist).
                        // To allow this, we first try to get a session silently.
                        silentFirst = true;
                        options = { createIfNone: true, clearSessionPreference: false, silent: false };
                        break;
                }

                let session: AuthenticationSession | undefined;
                if (silentFirst) {
                    // The 'silent' option is incompatible with most other options, so we completely replace the options object here.
                    session = await authentication.getSession(AzureAuth.getConfiguredAuthProviderId(), scopes, { silent: true });
                }

                if (!session) {
                    session = await authentication.getSession(AzureAuth.getConfiguredAuthProviderId(), scopes, options);
                }

                if (!session) {
                    return { succeeded: false, error: UiStrings.NoAzureSessionFound };
                }

                return { succeeded: true, result: Object.assign(session, { tenantId }) };
            } catch (e) {
                return { succeeded: false, error: l10n.t(UiStrings.FailedTo, GeneralUtils.getErrorMessage(e)) };
            } finally {
                this.handleSessionChanges = true;
            }
        }
    }

}
