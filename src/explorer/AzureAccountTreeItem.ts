/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { UiStrings } from "../uiStrings";
import * as vscode from "vscode";
import { AzExtParentTreeItem, AzExtTreeItem, registerEvent, GenericTreeItem, ISubscriptionContext } from '@microsoft/vscode-azext-utils';
import { AzureSubscriptionHelper } from "../azure/azureLogin/subscriptions";
import { AzureSessionProvider, ReadyAzureSessionProvider, SelectionType, SignInStatus } from "../azure/azureLogin/authTypes";
import { GeneralUtils } from "../utils/generalUtils";
import { AzureAuth } from "../azure/azureLogin/azureAuth";
import { APIMAccountCommandId } from "../constants";
import { Subscription } from "@azure/arm-resources-subscriptions";
import { ApiManagementProvider } from "./ApiManagementProvider";

export class AzureAccountTreeItem extends AzExtParentTreeItem {
    private subscriptionTreeItems: AzExtTreeItem[] | undefined;
    public static contextValue: string = "azureApiManagementAzureAccount";
    public readonly contextValue: string = AzureAccountTreeItem.contextValue;
    constructor(private readonly sessionProvider: AzureSessionProvider) {
      super(undefined);
      this.autoSelectInTreeItemPicker = true;
  
      const onStatusChange = this.sessionProvider.signInStatusChangeEvent;
      const onFilteredSubscriptionsChange = AzureSubscriptionHelper.getFilteredSubscriptionsChangeEvent();
      registerEvent("azureAccountTreeItem.onSignInStatusChange", onStatusChange, (context) => this.refresh(context));
      registerEvent("azureAccountTreeItem.onSubscriptionFilterChange", onFilteredSubscriptionsChange, (context) =>
        this.refresh(context),
      );
    }
  
    public override get label() {
      return UiStrings.AzureAccount;
    }
  
    public dispose(): void { }
  
    public hasMoreChildrenImpl(): boolean {
      return false;
    }
  
    // no need to sort the array
    public compareChildrenImpl(_item1: AzExtTreeItem, _item2: AzExtTreeItem): number {
      return 0;
    }
  
    public async loadMoreChildrenImpl(): Promise<AzExtTreeItem[]> {
      const existingSubscriptionTreeItems: AzExtTreeItem[] = this.subscriptionTreeItems || [];
      this.subscriptionTreeItems = [];
  
      switch (this.sessionProvider.signInStatus) {
        case SignInStatus.Initializing:
          return [
            new GenericTreeItem(this, {
              label: UiStrings.Loading,
              contextValue: "azureCommand",
              id: APIMAccountCommandId.accountLoading,
              iconPath: new vscode.ThemeIcon("loading~spin"),
            }),
          ];
        case SignInStatus.SignedOut:
          return [
            new GenericTreeItem(this, {
              label: UiStrings.SignIntoAzure,
              commandId: "azureApiManagement.signInToAzure",
              contextValue: "azureCommand",
              id: APIMAccountCommandId.accountSignIn,
              iconPath: new vscode.ThemeIcon("sign-in"),
              includeInTreeItemPicker: true,
            }),
            new GenericTreeItem(this, {
              label: UiStrings.CreateAzureAccount,
              commandId: "azureApiManagement.openUrl",
              contextValue: "azureCommand",
              id: APIMAccountCommandId.createAzureAccount,
              iconPath: new vscode.ThemeIcon("add"),
              includeInTreeItemPicker: true,
            }),
            new GenericTreeItem(this, {
              label: UiStrings.CreateAzureStudentAccount,
              commandId: "azureApiManagement.openUrl",
              contextValue: "azureCommand",
              id: APIMAccountCommandId.createAzureStudentAccount,
              iconPath: new vscode.ThemeIcon("mortar-board"),
              includeInTreeItemPicker: true,
            })
          ];
        case SignInStatus.SigningIn:
          return [
            new GenericTreeItem(this, {
              label: UiStrings.WaitForAzureSignIn,
              contextValue: "azureCommand",
              id: APIMAccountCommandId.accountSigningIn,
              iconPath: new vscode.ThemeIcon("loading~spin"),
            }),
          ];
      }
  
      if (this.sessionProvider.selectedTenant === null && this.sessionProvider.availableTenants.length > 1) {
        // Signed in, but no tenant selected, AND there is more than one tenant to choose from.
        return [
          new GenericTreeItem(this, {
            label: UiStrings.SelectTenant,
            commandId: "azureApiManagement.selectTenant",
            contextValue: "azureCommand",
            id: APIMAccountCommandId.accountSelectTenant,
            iconPath: new vscode.ThemeIcon("account"),
            includeInTreeItemPicker: true,
          }),
        ];
      }
  
      // Either we have a selected tenant, or there is only one available tenant and it's not selected
      // because it requires extra interaction. Calling `getAuthSession` will complete that process.
      // We will need the returned auth session in any case for creating a subscription context.
      const session = await this.sessionProvider.getAuthSession();
      if (GeneralUtils.failed(session) || !AzureAuth.isReady(this.sessionProvider)) {
        return [
          new GenericTreeItem(this, {
            label: UiStrings.ErrorAuthenticating,
            contextValue: "azureCommand",
            id: APIMAccountCommandId.accountError,
            iconPath: new vscode.ThemeIcon("error"),
          }),
        ];
      }
  
      const subscriptions = await AzureSubscriptionHelper.getSubscriptions(this.sessionProvider, SelectionType.Filtered);
      if (GeneralUtils.failed(subscriptions)) {
        return [
          new GenericTreeItem(this, {
            label: UiStrings.ErrorLoadingSubscriptions,
            contextValue: "azureCommand",
            id: APIMAccountCommandId.accountError,
            iconPath: new vscode.ThemeIcon("error"),
            description: subscriptions.error,
          }),
        ];
      }
  
      if (subscriptions.result.length === 0) {
        return [
          new GenericTreeItem(this, {
            label: UiStrings.SelectSubscriptionInPanel,
            commandId: "azureApiManagement.selectSubscriptions",
            contextValue: "azureCommand",
            id: APIMAccountCommandId.accountSubscription,
            includeInTreeItemPicker: true,
          }),
        ];
      }
  
      // We've confirmed above that the provider is ready.
      const readySessionProvider: ReadyAzureSessionProvider = this.sessionProvider;
  
      this.subscriptionTreeItems = await Promise.all(
        subscriptions.result.map(async (subscription: any) => {
          const existingTreeItem: AzExtTreeItem | undefined = existingSubscriptionTreeItems.find(
            (ti) => ti.id === subscription.subscriptionId,
          );
          if (existingTreeItem) {
            return existingTreeItem;
          } else {
            const subscriptionContext = getSubscriptionContext(
              readySessionProvider,
              session.result,
              subscription,
            );
            return new ApiManagementProvider(this, subscriptionContext);
          }
        }),
      );
  
      return this.subscriptionTreeItems!;
    }
  }
  
  function getSubscriptionContext(
    sessionProvider: ReadyAzureSessionProvider,
    session: vscode.AuthenticationSession,
    subscription: Subscription,
  ): ISubscriptionContext {
    const credentials = AzureAuth.getCredential(sessionProvider);      
    const environment = AzureAuth.getEnvironment();
  
    return {
      credentials,
      createCredentialsForScopes: ()=> { return Promise.resolve(credentials); },
      subscriptionDisplayName: subscription.displayName || "",
      subscriptionId: subscription.subscriptionId || "",
      subscriptionPath: `/subscriptions/${subscription.subscriptionId}`,
      tenantId: subscription.tenantId || "",
      userId: session.account.label,
      environment,
      isCustomCloud: environment.name === "AzureCustomCloud",
    };
  }