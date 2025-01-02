/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtServiceClientCredentials } from "@microsoft/vscode-azext-utils";
import { ProgressLocation, QuickPickItem, window } from "vscode";
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ApimService } from "../../azure/apim/ApimService";
import { GraphService } from "../../azure/graph/GraphService";
import { ResourceGraphService } from "../../azure/resourceGraph/ResourceGraphService";
import { AuthorizationAccessPoliciesTreeItem, IAuthorizationAccessPolicyTreeItemContext } from "../../explorer/AuthorizationAccessPoliciesTreeItem";
import { AuthorizationTreeItem } from "../../explorer/AuthorizationTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { nonNullValue } from "../../utils/nonNull";

const systemAssignedManagedIdentitiesOptionLabel = "System assigned managed identity";
const userAssignedManagedIdentitiesOptionLabel = "User assigned managed identity";
const userEmailIdLabel = "User";
const groupDisplayNameorEmailIdLabel = "Group";
const servicePrincipalDisplayNameLabel = "Service principal";

let resourceGraphService: ResourceGraphService;
let graphService: GraphService;

 // tslint:disable-next-line: no-any no-unsafe-any
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

    resourceGraphService = new ResourceGraphService(
        node.root.credentials,
        node.root.environment.resourceManagerEndpointUrl,
        node.root.subscriptionId
    );

    graphService = new GraphService(
        node.root.credentials,
        nonNullValue(node.root.environment.activeDirectoryGraphResourceId),
        node.root.tenantId
    );

    await graphService.acquireGraphToken();

    const identityOptions = await populateIdentityOptionsAsync(
        apimService, node.root.credentials, node.root.environment.resourceManagerEndpointUrl);

    const identitySelected = await ext.ui.showQuickPick(
        identityOptions, { placeHolder: 'Select identity...', canPickMany: false, suppressPersistence: true });

    let permissionName = '';
    let oid = '';

    if (identitySelected.label === systemAssignedManagedIdentitiesOptionLabel) {
        const response =  await resourceGraphService.listSystemAssignedIdentities();
         // tslint:disable-next-line: no-any no-unsafe-any
        const otherManagedIdentityOptions = await populateManageIdentityOptions(response);

        const managedIdentitySelected = await ext.ui.showQuickPick(
            otherManagedIdentityOptions, { placeHolder: 'Select system assigned managed identity ...', canPickMany: false, suppressPersistence: true });

        permissionName = managedIdentitySelected.label;
        oid = nonNullValue(managedIdentitySelected.description);
    } else if (identitySelected.label === userAssignedManagedIdentitiesOptionLabel) {
        const response =  await resourceGraphService.listUserAssignedIdentities();
        const otherManagedIdentityOptions = await populateManageIdentityOptions(response);

        const managedIdentitySelected = await ext.ui.showQuickPick(
            otherManagedIdentityOptions, { placeHolder: 'Select user assigned managed identity ...', canPickMany: false, suppressPersistence: true });

        permissionName = managedIdentitySelected.label;
        oid = nonNullValue(managedIdentitySelected.description);
    } else if (identitySelected.label === userEmailIdLabel) {
        const userId = await askInput('Enter user emailId ...', 'mary@contoso.net');
        const user = await graphService.getUser(userId);

        if (user !== undefined && user.objectId !== null) {
            permissionName = user.userPrincipalName;
            oid = user.objectId;
        } else {
            window.showErrorMessage(localize('invalidUserEmailId', 'Please specify a valid user emailId.'));
        }
    } else if (identitySelected.label === groupDisplayNameorEmailIdLabel) {
        const groupDisplayNameOrEmailId = await askInput('Enter group displayname (or) emailId ...', 'myfullgroupname (or) mygroup@contoso.net');
        const group = await graphService.getGroup(groupDisplayNameOrEmailId);

        if (group !== undefined && group.objectId !== null) {
            permissionName = group.displayName.replace(' ', '');
            oid = group.objectId;
        } else {
            window.showErrorMessage(localize('invalidGroupDisplayNameorEmailId', 'Please specify a valid group display name (or) emailId. Example, myfullgroupname (or) mygroup@contoso.net'));
        }
    } else if (identitySelected.label === servicePrincipalDisplayNameLabel) {
        const servicePrincipalDisplayName = await askInput('Enter service principal display name ...', 'myserviceprincipalname');

        const spn = await graphService.getServicePrincipal(servicePrincipalDisplayName);

        if (spn !== undefined && spn.objectId !== null) {
            permissionName = spn.displayName.replace(' ', '');
            oid = spn.objectId;
        } else {
            window.showErrorMessage(localize('invalidSpnDisplayName', 'Please specify a valid service principal display name.'));
        }
    } else {
        permissionName = identitySelected.label;
        oid = nonNullValue(identitySelected.description);
    }

    context.authorizationAccessPolicyName = permissionName;
    context.authorizationAccessPolicy = {
        objectId: oid,
        tenantId: node.root.tenantId
    };

    createAccessPolicy(permissionName, node, context);
}

function createAccessPolicy(
    permissionName: string,
    node: AuthorizationAccessPoliciesTreeItem,
    context: IActionContext & Partial<IAuthorizationAccessPolicyTreeItemContext>) : void {
    window.withProgress(
        {
            location: ProgressLocation.Notification,
            title: localize("creatingAuthorizationPermission", `Creating Access policy '${permissionName}' for Authorization ${node.root.authorizationName} ...`),
            cancellable: false
        },
        async () => {
            // tslint:disable-next-line:no-non-null-assertion
            return node!.createChild(context);
        }
    ).then(async () => {
        // tslint:disable-next-line:no-non-null-assertion
        await node!.refresh(context);
        window.showInformationMessage(localize("createdAuthorizationPermission", `Created Access policy '${permissionName}' successfully.`));
    });
}

async function populateIdentityOptionsAsync(
    apimService: ApimService,
    credential : AzExtServiceClientCredentials,
    resourceManagerEndpointUrl: string) : Promise<QuickPickItem[]> {
    const options : QuickPickItem[] = [];

    // 1. Self
    const token = await credential.getToken();
    const meOption : QuickPickItem = {
        label: nonNullValue(token.userId),
        description: token.oid,
        detail: "Current signedIn user"
    };
    options.push(meOption);

    // 2. APIM Service
    const service = await apimService.getService();
    if (!!service.identity?.principalId) {
        const apimOption : QuickPickItem = {
            label: service.name,
            description: service.identity.principalId,
            detail: "Current service system managed identity"
        };
        options.push(apimOption);
    }

    // 3. Other Managed identities. Dogfood doesn't support this endpoint, so only show this in prod
    if (resourceManagerEndpointUrl === "https://management.azure.com/") {
        const systemAssignedManagedIdentities : QuickPickItem = {
            label: systemAssignedManagedIdentitiesOptionLabel,
            description: "",
            detail: ""
        };
        options.push(systemAssignedManagedIdentities);

        const userAssignedManagedIdentities : QuickPickItem = {
            label: userAssignedManagedIdentitiesOptionLabel,
            description: "",
            detail: ""
        };
        options.push(userAssignedManagedIdentities);
    }

    // 4. Custom
    options.push({ label: userEmailIdLabel });
    options.push({ label: groupDisplayNameorEmailIdLabel });
    options.push({ label: servicePrincipalDisplayNameLabel });
    return options;
}

// tslint:disable-next-line:no-any
async function populateManageIdentityOptions(data: { name: string, id: string, principalId: string }[]) : Promise<QuickPickItem[]> {
    const options : QuickPickItem[] = [];
    const managedIdentityOptions : QuickPickItem[] = data.map(d => {
        return {
            label: d.name,
            description: d.principalId,
            detail: d.id
        };
    });
    options.push(...managedIdentityOptions);

    return options;
}

async function askInput(message: string, placeholder: string = '') : Promise<string> {
    const idPrompt: string = localize('value', message);
    return (await ext.ui.showInputBox({
        prompt: idPrompt,
        placeHolder: placeholder,
        validateInput: async (value: string): Promise<string | undefined> => {
            value = value ? value.trim() : '';
            if (value === '') {
                return localize("valueInvalid", 'Value cannot be empty.');
            }
            return undefined;
        }
    })).trim();
}
