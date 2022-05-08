/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProgressLocation, QuickPickItem, window } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ApimService } from "../../azure/apim/ApimService";
import { GraphService } from "../../azure/graph/GraphService";
import { ResourceGraphService } from "../../azure/resourceGraph/ResourceGraphService";
import { AuthorizationAccessPoliciesTreeItem, IAuthorizationAccessPolicyTreeItemContext } from "../../explorer/AuthorizationAccessPoliciesTreeItem";
import { AuthorizationTreeItem } from "../../explorer/AuthorizationTreeItem";
import { ext } from "../../extensionVariables";
import { localize } from "../../localize";
import { nonNullValue } from "../../utils/nonNull";

const systemAssignedManagedIdentitiesOptionLabel = "System assigned managed identities..."
const userAssignedManagedIdentitiesOptionLabel = "User assigned managed identities..."
const userObjectIdLabel = "Specify user emailId...";

//TODO: Add Groups and ServicePrincipals

let resourceGraphService: ResourceGraphService;
let graphService: GraphService;

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
        node.root.subscriptionId, 
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
        identityOptions, { placeHolder: 'Select Identity...', canPickMany: false, suppressPersistence: true });

    let permissionName = '';
    let oid = '';

    if (identitySelected.label == systemAssignedManagedIdentitiesOptionLabel) {
        const response =  await resourceGraphService.listSystemAssignedIdentities()
        var otherManagedIdentityOptions = await populateManageIdentityOptions(response.data);
        
        var managedIdentitySelected = await ext.ui.showQuickPick(
            otherManagedIdentityOptions, { placeHolder: 'Select System Assigned Managed Identity ...', canPickMany: false, suppressPersistence: true });
        
        permissionName = managedIdentitySelected.label;
        oid = managedIdentitySelected.description!;
    }
    else if (identitySelected.label == userAssignedManagedIdentitiesOptionLabel) {
        const response =  await resourceGraphService.listUserAssignedIdentities()
        var otherManagedIdentityOptions = await populateManageIdentityOptions(response.data);
        
        var managedIdentitySelected = await ext.ui.showQuickPick(
            otherManagedIdentityOptions, { placeHolder: 'Select User Assigned Managed Identity ...', canPickMany: false, suppressPersistence: true });
        
        permissionName = managedIdentitySelected.label;
        oid = managedIdentitySelected.description!;
    }
    else if (identitySelected.label == userObjectIdLabel) {
        const userId = await askInput('Enter user emailId ...', 'mary@contoso.net');

        const user = await graphService.getUser(userId);
        
        if(user) {
            permissionName = user.userPrincipalName;
            oid = user.objectId;
        } else {
            window.showErrorMessage(localize('invalidUserEmailId', 'Please specify a valid user emailId. Example, mary@contoso.net'))
        }
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
            detail: "Current Service managed identity"
        }
        options.push(apimOption);
    }

    // 3. Other Managed identities. Dogfood doesn't support this endpoint, so only show this in prod
    if (resourceManagerEndpointUrl == "https://management.azure.com/") {
        const systemAssignedManagedIdentities : QuickPickItem = {
            label: systemAssignedManagedIdentitiesOptionLabel,
            description: "",
            detail: "",
        }
        options.push(systemAssignedManagedIdentities); 
        
        const userAssignedManagedIdentities : QuickPickItem = {
            label: userAssignedManagedIdentitiesOptionLabel,
            description: "",
            detail: "",
        }
        options.push(userAssignedManagedIdentities); 
    }
    
    // 4. Custom
    const customOption : QuickPickItem = {
        label: userObjectIdLabel,
        description: "",
        detail: "",
    }
    options.push(customOption);
    return options;
}

async function populateManageIdentityOptions(data: any) : Promise<QuickPickItem[]> {
    const options : QuickPickItem[] = [];
    const managedIdentityOptions : QuickPickItem[] = data.filter(d => !!d.principalId).map(d => {
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
        placeHolder: placeholder
    })).trim();
}