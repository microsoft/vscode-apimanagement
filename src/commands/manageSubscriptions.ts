/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiContract, ProductContract, UserContract } from "@azure/arm-apimanagement/src/models";
import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ISubscriptionContract } from "../azure/webApp/contracts";
import * as Constants from "../constants";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { SubscriptionsTreeItem } from "../explorer/SubscriptionsTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

// tslint:disable: no-non-null-assertion
// tslint:disable-next-line: export-name
export async function createSubscription(context: IActionContext, node?: SubscriptionsTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.subscriptionsTreeItem;
    }

    const name = await askName(node);
    const displayName = await askDisplayname();
    const allowTrace = await askTrace();
    const user = await askUser(node);
    let scope = await askScope();
    if (scope === "All APIs") {
        scope = "/apis";
    } else if (scope === "API") {
        const api = await askAPI(node);
        scope = "/apis/".concat(api.value.id!);
    } else if (scope === "Product") {
        const product = await askProduct(node);
        scope = "/apis/".concat(product.value.id!);
    }
    const subContract: ISubscriptionContract = {
        scope: scope,
        displayName: displayName,
        name: name,
        allowTracing: (allowTrace === "Yes") ? true : false,
        ownerId: user.value.id!,
        state: "active" // should we always make it active
    };

    await window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("subscription", "Create new subscription..."),
            cancellable: false
        },
        async () => {
            await node!.root.client.subscription.createOrUpdate(node!.root.resourceGroupName, node!.root.serviceName, name, subContract);
            await node!.refresh(context);
        }
    ).then(async () => {
        window.showInformationMessage(localize("createSubscription", "Subscription has been created successfully."));
    });
}

async function askName(node: SubscriptionsTreeItem): Promise<string> {
    const subNames = (await node.root.client.subscription.list(
        node.root.resourceGroupName,
        node.root.serviceName)).map(s => s.name!);

    const subNamePrompt: string = localize('subNamePrompt', 'Enter Subscription Name.');
    return (await ext.ui.showInputBox({
        prompt: subNamePrompt,
        validateInput: async (value: string | undefined): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return validateSubscriptionName(value, subNames);
        }
    })).trim();
}

function validateSubscriptionName(subName: string, subNames: string[]): string | undefined {
    if (subName.length > Constants.maxApiNameLength) {
        return localize("subNameMaxLength", `API name cannot be more than ${Constants.maxApiNameLength} characters long.`);
    }
    if (subName.match(/^[^*#&+:<>?]+$/) === null) {
        return localize("subNameInvalid", 'Invalid API Name.');
    }
    if (subNames.indexOf(subName) !== -1) {
        return localize("subNameInvalid", 'Subscription already exist.');
    }

    return undefined;
}

async function askDisplayname(): Promise<string> {
    const idPrompt: string = localize('idPrompt', 'Enter Subscription DisplayName.');
    return (await ext.ui.showInputBox({
        prompt: idPrompt,
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return validateDisplayName(value);
        }
    })).trim();
}

function validateDisplayName(id: string): string | undefined {
    const test = "^[\w]+$)|(^[\w][\w\-]+[\w]$";
    if (id.match(test) === null) {
        return localize("subscriptionInvalid", 'Invalid Subscription Name.');
    }

    return undefined;
}

async function askScope(): Promise<string> {
    const items : string[] = ["All APIs", "API", "Product"];
    return (await ext.ui.showQuickPick(items.map((s) => { return {label: s}; }), { canPickMany: false, placeHolder: 'Select Scope'})).label;
}

async function askUser(node: SubscriptionsTreeItem): Promise<{ label: string; value: UserContract; }> {
    const users = await node.root.client.user.listByService(node.root.resourceGroupName, node.root.serviceName);
    return (await ext.ui.showQuickPick(users.map((s) => { return {label: s.firstName!.concat(s.lastName!).concat(" (").concat(s.email!).concat(")"), value: s}; }), { canPickMany: false, placeHolder: 'Select User'}));
}

async function askAPI(node: SubscriptionsTreeItem): Promise<{ label: string; value: ApiContract; }> {
    const apis = await node.root.client.api.listByService(node.root.resourceGroupName, node.root.serviceName);
    return (await ext.ui.showQuickPick(apis.map((s) => { return {label: s.displayName!, value: s}; }), { canPickMany: false, placeHolder: 'Select API'}));
}

async function askProduct(node: SubscriptionsTreeItem): Promise<{ label: string; value: ProductContract; }> {
    const products = await node.root.client.product.listByService(node.root.resourceGroupName, node.root.serviceName);
    return (await ext.ui.showQuickPick(products.map((s) => { return {label: s.displayName, value: s}; }), { canPickMany: false, placeHolder: 'Select Product'}));
}

async function askTrace(): Promise<string> {
    const allowTrace = ["Yes", "No"];
    return (await ext.ui.showQuickPick(allowTrace.map((s) => { return {label: s}; }), { canPickMany: false, placeHolder: 'Allow Trace?'})).label;
}
