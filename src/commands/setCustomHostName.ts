/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window } from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { gatewayHostName } from '../constants';
import { ServiceTreeItem } from '../explorer/ServiceTreeItem';
import { ext } from '../extensionVariables';
import { localize } from '../localize';

// tslint:disable-next-line: export-name
export async function setCustomHostName(context: IActionContext, node?: ServiceTreeItem): Promise<void> {
    if (!node) {
        node = <ServiceTreeItem>await ext.tree.showTreeItemPicker(ServiceTreeItem.contextValue, context);
    }

    const service = await node.root.client.apiManagementService.get(node.root.resourceGroupName, node.root.serviceName);
    // tslint:disable-next-line: no-non-null-assertion
    const hostNameConfigs = service.hostnameConfigurations!;
    const customHostName : string | undefined = ext.context.globalState.get(node.root.serviceName + gatewayHostName);
    let allHostNames : {label: string, hostName: string}[];
    if (customHostName === undefined) {
        allHostNames = hostNameConfigs.filter((s) => (s.type === "Proxy")).map(s => {return {label: s.hostName, hostName: s.hostName}; } );
    } else {
        allHostNames = hostNameConfigs.filter((s) => (s.type === "Proxy")).map(s => {
            if (s.hostName === customHostName) {
                // tslint:disable-next-line: prefer-template
                return {label: s.hostName + " (Currently selected)", hostName: s.hostName};
            } else {
                return {label: s.hostName, hostName: s.hostName};
            }
        });
    }
    const selfDefined = localize('', "Input a hostname (for self-hosted gateway)");
    allHostNames.push({label: selfDefined, hostName: ""});
    window.showInformationMessage(localize("", "Select the gateway hostname for testing and debugging APIs."));
    const pick = await ext.ui.showQuickPick(allHostNames.map((s) => { return {label: s.label, gateway: s}; }), { canPickMany: false});
    if (pick.label === selfDefined) {
        const namespacePrompt: string = localize('urlPrompt', 'Enter Custom Host Name.');
        const input = await ext.ui.showInputBox({
            prompt: namespacePrompt,
            validateInput: async (value: string | undefined): Promise<string | undefined> => {
                value = value ? value.trim() : '';
                return undefined;
            }
        });
        ext.context.globalState.update(node.root.serviceName + gatewayHostName, input);
    } else {
        ext.context.globalState.update(node.root.serviceName + gatewayHostName, pick.gateway.hostName);
    }
    window.showInformationMessage(localize("", `Gateway swithed to host name ${pick.gateway.hostName} successfully.`));
}
