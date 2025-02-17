// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as vscode from "vscode";

export class UiStrings {
    static readonly AzureAccount = vscode.l10n.t("Azure");
    static readonly Loading = vscode.l10n.t("Loading...");
    static readonly CreateAzureStudentAccount = vscode.l10n.t("Create an Azure for Students Account...");
    static readonly CreateAzureAccount = vscode.l10n.t("Create an Azure Account...");
    static readonly WaitForAzureSignIn = vscode.l10n.t("Waiting for Azure sign-in...");
    static readonly SignIntoAzure = vscode.l10n.t("Sign in to Azure...");
    static readonly SelectTenant = vscode.l10n.t("Select tenant...");
    static readonly ErrorAuthenticating = vscode.l10n.t("Error authenticating");
    static readonly SelectTenantBeforeSignIn = vscode.l10n.t("You must sign in before selecting a tenant.");
    static readonly NoTenantSelected = vscode.l10n.t("No tenant selected.");
    static readonly NoSubscriptionsFoundAndSetup = vscode.l10n.t("No subscriptions were found. Set up your account if you have yet to do so.");
    static readonly SetUpAzureAccount = vscode.l10n.t("Set up Account");
    static readonly NoSubscriptionsFound = vscode.l10n.t("No subscriptions found");
    static readonly ErrorLoadingSubscriptions = vscode.l10n.t("Error loading subscriptions");
    static readonly SelectSubscription = vscode.l10n.t("Select Subscriptions");
    static readonly NoMSAuthSessionFound = vscode.l10n.t("No Microsoft authentication session found: {0}");
    static readonly SelectATenant = vscode.l10n.t("Select a tenant");
    static readonly WaitForSignIn = vscode.l10n.t("Waiting for sign-in");
    static readonly CustomCloudChoiseNotConfigured = vscode.l10n.t("The custom cloud choice is not configured. Please configure the setting {0}.{1}.");
    static readonly FailedToListGroup = vscode.l10n.t("Failed to list resources: {0}");
    static readonly NotSignInStatus = vscode.l10n.t("Not signed in {0}");
    static readonly NoTenantFound = vscode.l10n.t("No tenants found.");
    static readonly NoAzureSessionFound = vscode.l10n.t("No Azure session found.");
    static readonly FailedTo = vscode.l10n.t("Failed to retrieve Azure session: {0}");
    static readonly SelectSubscriptionInPanel = vscode.l10n.t("Select Subscriptions...");
}
