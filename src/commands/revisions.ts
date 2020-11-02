/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { ApiContract, ApiReleaseContract, ApiRevisionCollection } from "azure-arm-apimanagement/lib/models";
import { Guid } from "guid-typescript";
import { window } from "vscode";
import { ApiTreeItem } from "../explorer/ApiTreeItem";
import { ext } from "../extensionVariables";
import { localize } from "../localize";

// tslint:disable: no-non-null-assertion
export async function revisions(node?: ApiTreeItem): Promise<void> {
    if (node === undefined) {
        node = <ApiTreeItem>await ext.tree.showTreeItemPicker(ApiTreeItem.contextValue);
    }

    const options = ["Make Current", "Switch Revisions"];
    const commands = await ext.ui.showQuickPick(options.map((s) => { return { label: s }; }), { canPickMany: false });

    if (commands.label === "Switch Revisions") {
        const pickedApi = await listRevisions(node);

        await node.reloadApi(pickedApi);
        await node.refresh();
        window.showInformationMessage(localize("switchRevisions", `Switched to revision ${pickedApi.name!} sucecessfully.`));

    } else if (commands.label === "Make Current") {
        const apiRevision = await listRevisions(node);
        const notes = await askReleaseNotes();

        const apiRelease: ApiReleaseContract = {
            apiId: "/apis/".concat(apiRevision.name!),
            notes: notes
        };
        const pickedApiName = node.root.apiName.split(";rev=")[0];
        const releaseId = Guid.create().toString();
        await node.root.client.apiRelease.createOrUpdate(node.root.resourceGroupName, node.root.serviceName, pickedApiName, releaseId, apiRelease);
        await node.refresh();
        window.showInformationMessage(localize("makeCurrent", `The revision ${apiRevision.name!} has been made current successfully.`));
    }
}

async function askReleaseNotes(): Promise<string> {
    const releaseNotesPrompt: string = localize('namespacePrompt', 'Enter release notes.');
    const defaultName = "New release";
    return (await ext.ui.showInputBox({
        prompt: releaseNotesPrompt,
        value: defaultName,
        validateInput: async (value: string | undefined): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            return undefined;
        }
    })).trim();
}

async function listRevisions(node: ApiTreeItem): Promise<ApiContract> {
    const nodeApiName = node.root.apiName.split(";rev=")[0];
    const apiRevisions: ApiRevisionCollection = await node.root.client.apiRevision.listByService(node.root.resourceGroupName, node.root.serviceName, nodeApiName);
    const apiIds = apiRevisions.map((s) => {
        return s.isCurrent !== undefined && s.isCurrent === true ? "Current" : s.apiId!;
    });
    const pickedApiRevision = await ext.ui.showQuickPick(apiIds.map((s) => { return { label: s }; }), { canPickMany: false });
    const apiName = pickedApiRevision.label.replace("/apis/", "");
    return await node.root.client.api.get(node.root.resourceGroupName, node.root.serviceName, apiName);
}
