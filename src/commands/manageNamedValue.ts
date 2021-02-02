/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { NamedValuesTreeItem } from "../explorer/NamedValuesTreeItem";
import { NamedValueTreeItem } from "../explorer/NamedValueTreeItem";
import { ServiceTreeItem } from "../explorer/ServiceTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

export async function createNamedValue(context: IActionContext, node?: NamedValuesTreeItem): Promise<void> {
    if (!node) {
        const serviceNode = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
        node = serviceNode.namedValuesTreeItem;
    }

    const id = await askId();
    const value = await askValue();
    const secret = await isSecret();

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("createNamedValue", `Creating named value '${id}' in API Management service ${node.root.serviceName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { return node!.createChild({ key: id, value: value, secret: secret }); }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("creatededNamedValue", `Created named value '${id}' succesfully.`));
    });
}

export async function updateNamedValue(context: IActionContext, node?: NamedValueTreeItem): Promise<void> {
    if (!node) {
        node = <NamedValueTreeItem>await ext.tree.showTreeItemPicker(NamedValueTreeItem.contextValue, context);
    }

    const displayName = node.propertyContract.displayName;
    const initialValue = await node.getValue();
    const value = await askValue(initialValue);
    const secret = await isSecret();

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("updateNamedValue", `Updating value for '${displayName}' ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { return node!.updateValue(value, secret); }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("updatedNamedValue", `Updated value for '${displayName}' succesfully.`));
    });
}

async function isSecret() : Promise<boolean | undefined> {
    const options = ['Yes', 'No'];
    const option = await ext.ui.showQuickPick(options.map((s) => { return { label: s, description: '', detail: '' }; }), { placeHolder: 'Is this a secret?', canPickMany: false });
    if (option.label === options[0]) {
        return true;
    }
    return undefined;
}

async function askId() : Promise<string> {
    const idPrompt: string = localize('idPrompt', 'Enter id');
    return (await ext.ui.showInputBox({
        prompt: idPrompt,
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return validateId(value);
        }
    })).trim();
}

async function askValue(initialValue?: string) : Promise<string> {
    const valuePrompt: string = localize('valuePrompt', 'Enter value');
    return (await ext.ui.showInputBox({
        prompt: valuePrompt,
        value: initialValue,
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            if (value === '') {
                return localize("valueInvalid", 'value cannot be empty.');
            }
            return undefined;
        }
    }));
}

function validateId(id: string): string | undefined {
    const test = "^[\w]+$)|(^[\w][\w\-]+[\w]$";
    if (id.match(test) === null) {
        return localize("idInvalid", 'Invalid API Name.');
    }

    return undefined;
}
