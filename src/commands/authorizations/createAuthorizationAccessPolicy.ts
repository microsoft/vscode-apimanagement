/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HttpOperationResponse, ServiceClient } from "@azure/ms-rest-js";
import { ProgressLocation, QuickPickItem, window } from "vscode";
import { createGenericClient, IActionContext } from "vscode-azureextensionui";
import { ApimService } from "../../azure/apim/ApimService";
import { AuthorizationAccessPoliciesTreeItem, IAuthorizationAccessPolicyTreeItemContext } from "../../explorer/AuthorizationAccessPoliciesTreeItem";
import { AuthorizationTreeItem } from "../../explorer/AuthorizationTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";

const otherManagedIdentitiesOptionLabel = "Other managed identities..."
const customOptionLabel = "Custom...";

export async function createAuthorizationAccessPolicy(context: IActionContext & Partial<IAuthorizationAccessPolicyTreeItemContext>, node?: AuthorizationAccessPoliciesTreeItem): Promise<void> {
    if (!node) {
        const AuthorizationNode = <AuthorizationTreeItem>await ext.tree.showTreeItemPicker(AuthorizationTreeItem.contextValue, context);
        node = AuthorizationNode.authorizationAccessPoliciesTreeItem;
    }

    const apimService = new ApimService(
        node.root.credentials, 
        node.root.environment.resourceManagerEndpointUrl, 
        node.root.subscriptionId, 
        node.root.resourceGroupName, 
        node.root.serviceName);

    const identityOptions = await populateIdentityOptionsAsync(
        apimService, node.root.credentials, node.root.environment.resourceManagerEndpointUrl);
    const identitySelected = await ext.ui.showQuickPick(
        identityOptions, { placeHolder: 'Select Identity...', canPickMany: false, suppressPersistence: true });

    if (identitySelected.label == otherManagedIdentitiesOptionLabel) {
        var otherManagedIdentityOptions = await populateOtherManageIdentityOptions(node.root.credentials, node.root.environment.resourceManagerEndpointUrl, node.root.subscriptionId);
        var managedIdentitySelected = await ext.ui.showQuickPick(
            otherManagedIdentityOptions, { placeHolder: 'Select Managed Identity ...', canPickMany: false, suppressPersistence: true });
        var permissionName = managedIdentitySelected.label;
        var oid = managedIdentitySelected.description!;
    }
    else if (identitySelected.label == customOptionLabel) {
        // No object id specified; ask explicitly
        var permissionName = await askInput('Enter Access policy name ...');
        var oid = await askInput('Enter AAD Object Id ...');
    } else {
        var permissionName = identitySelected.label;
        var oid = identitySelected.description!;
    }

    context.authorizationAccessPolicyName = permissionName;
    context.authorizationAccessPolicy = {
        objectId: oid,
        tenantId: node.root.tenantId
    }

    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingAuthorizationPermission", `Creating Access Policy '${permissionName}' for Authorization ${node.root.authorizationName} ...`),
            cancellable: false
        },
        // tslint:disable-next-line:no-non-null-assertion
        async () => { 
            return node!.createChild(context); 
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("createdAuthorizationPermission", `Created Access Policy '${permissionName}' successfully.`));
    });
}

async function populateIdentityOptionsAsync(apimService: ApimService, credential, resourceManagerEndpointUrl: string) : Promise<QuickPickItem[]> {
    const options : QuickPickItem[] = [];

    // 1. Self
    const token = await credential.getToken();
    const meOption : QuickPickItem = {
        label: token.userId,
        description: token.oid,
        detail: "Current User"
    }
    options.push(meOption);

    // 2. APIM Service
    const service = await apimService.getService();
    if (!!service.identity?.principalId) {
        const apimOption : QuickPickItem = {
            label: service.name,
            description: service.identity.principalId,
            detail: "Current APIM Service's managed identity"
        }
        options.push(apimOption);
    }

    // 3. Other Managed identities. Dogfood doesn't support this endpoint, so only show this in prod
    if (resourceManagerEndpointUrl == "https://management.azure.com/") {
        const otherManagedIdentities : QuickPickItem = {
            label: otherManagedIdentitiesOptionLabel,
            description: "",
            detail: "",
        }
        options.push(otherManagedIdentities);    
    }
    
    // 4. Custom
    const customOption : QuickPickItem = {
        label: customOptionLabel,
        description: "",
        detail: "",
    }
    options.push(customOption);
    return options;
}

async function populateOtherManageIdentityOptions(credential, resourceManagerEndpointUrl : string, subscriptionId : string) : Promise<QuickPickItem[]> {
    const options : QuickPickItem[] = [];

    const client: ServiceClient = await createGenericClient(credential);
    try {
        var response : HttpOperationResponse | undefined = await client.sendRequest({
            method: "POST",
            url: `${resourceManagerEndpointUrl}/providers/Microsoft.ResourceGraph/resources?api-version=2019-04-01`,
            body: {
                "subscriptions": [ subscriptionId ],
                "options": { "resultFormat": "objectArray" },
                "query": "Resources | where type =~ 'Microsoft.Web/sites' | where notempty(identity) | project name, type, identity"
            },
            timeout: 5000 // TODO(seaki): decide on timeout value
        });
    } catch (ex) {
        var response : HttpOperationResponse | undefined = undefined;
    }
    if (response?.status == 200) {
        const managedIdentityOptions : QuickPickItem[] = response.parsedBody.data.filter(d => !!d.identity?.principalId).map(d => {
            return {
                label: d.name, 
                description: d.identity?.principalId, 
                detail: d.type
            };
        }); 
        options.push(...managedIdentityOptions);
    }
    return options;
}

async function askInput(message: string) : Promise<string> {
    const idPrompt: string = localize('value', message);
    return (await ext.ui.showInputBox({
        prompt: idPrompt
    })).trim();
}