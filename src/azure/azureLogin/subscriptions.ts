// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { Subscription, SubscriptionClient } from "@azure/arm-resources-subscriptions";
import * as vscode from "vscode";
import { GeneralUtils } from "../../utils/generalUtils";
import { ReadyAzureSessionProvider, SelectionType, SubscriptionFilter } from "./authTypes";
import { AzureAuth } from "./azureAuth";

export namespace AzureSubscriptionHelper {
    const onFilteredSubscriptionsChangeEmitter = new vscode.EventEmitter<void>();

    export function getFilteredSubscriptionsChangeEvent() {
        return onFilteredSubscriptionsChangeEmitter.event;
    }

    export function getFilteredSubscriptions(): SubscriptionFilter[] {
        try {
            let values = vscode.workspace.getConfiguration("azure-api-center").get<string[]>("selectedSubscriptions", []);
            return values.map(asSubscriptionFilter).filter((v) => v !== null) as SubscriptionFilter[];
        } catch (e) {
            return [];
        }
    }

    function asSubscriptionFilter(value: string): SubscriptionFilter | null {
        try {
            const parts = value.split("/");
            return { tenantId: parts[0], subscriptionId: parts[1] };
        } catch (e) {
            return null;
        }
    }

    /**
     * A subscription with the subscriptionId and displayName properties guaranteed to be defined.
     */
    export type DefinedSubscription = Subscription & Required<Pick<Subscription, "subscriptionId" | "displayName">>;

    export async function getSubscriptions(
        sessionProvider: ReadyAzureSessionProvider,
        selectionType: SelectionType,
    ): Promise<GeneralUtils.Errorable<DefinedSubscription[]>> {
        const client = getSubscriptionClient(sessionProvider);
        const subsResult = await AzureAuth.listAll(client.subscriptions.list());
        return GeneralUtils.errMap(subsResult, (subs: any) => sortAndFilter(subs.filter(isDefinedSubscription), selectionType));
    }

    function sortAndFilter(subscriptions: DefinedSubscription[], selectionType: SelectionType): DefinedSubscription[] {
        const attemptFilter = selectionType === SelectionType.Filtered || selectionType === SelectionType.AllIfNoFilters;
        if (attemptFilter) {
            const filters = getFilteredSubscriptions();
            const filteredSubs = subscriptions.filter((s) => filters.some((f: any) => f.subscriptionId === s.subscriptionId));
            const returnAll = selectionType === SelectionType.AllIfNoFilters && filteredSubs.length === 0;
            if (!returnAll) {
                subscriptions = filteredSubs;
            }
        }

        return subscriptions.sort((a, b) => a.displayName.localeCompare(b.displayName));
    }

    function isDefinedSubscription(sub: Subscription): sub is DefinedSubscription {
        return sub.subscriptionId !== undefined && sub.displayName !== undefined;
    }

    export async function setFilteredSubscriptions(filters: SubscriptionFilter[]): Promise<void> {
        const existingFilters = getFilteredSubscriptions();
        const filtersChanged =
            existingFilters.length !== filters.length ||
            !filters.every((f) => existingFilters.some((ef) => ef.subscriptionId === f.subscriptionId));

        const values = filters.map((f) => `${f.tenantId}/${f.subscriptionId}`).sort();

        if (filtersChanged) {
            await vscode.workspace
                .getConfiguration("azure-api-center")
                .update("selectedSubscriptions", values, vscode.ConfigurationTarget.Global, true);
            onFilteredSubscriptionsChangeEmitter.fire();
        }
    }

    export function getSubscriptionClient(sessionProvider: ReadyAzureSessionProvider): SubscriptionClient {
        return new SubscriptionClient(AzureAuth.getCredential(sessionProvider), { endpoint: getArmEndpoint() });
    }
    function getArmEndpoint(): string {
        return AzureAuth.getEnvironment().resourceManagerEndpointUrl;
    }
}
