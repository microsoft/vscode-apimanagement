/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//import * as assert from 'assert';
//import { ApiManagementClient, ApiManagementModels } from 'azure-arm-apimanagement';
//import { ApiManagementClient } from 'azure-arm-apimanagement';
import { ResourceManagementClient } from '@azure/arm-resources';
import { Context, Suite } from 'mocha';
import * as vscode from 'vscode';
import { ISubscriptionContext, TestAzureAccount} from '@microsoft/vscode-azext-dev';
import { AzExtTreeDataProvider, AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';
//import { ApiManagementProvider, AzureTreeDataProvider, ext, getRandomHexString, TestAzureAccount, TestUserInput, treeUtils } from '../extension.bundle';
import { AzureAccountTreeItem, ext, treeUtils } from '../extension.bundle';
import { longRunningTestsEnabled } from './global.test';
import { HttpHeaders } from '@azure/ms-rest-js';
//import { runWithApimSetting } from './runWithSetting';

// tslint:disable-next-line:max-func-body-length
suite('Create Azure Resources', async function (this: Suite): Promise<void> {
    this.timeout(1200 * 1000);
    const resourceGroupsToDelete: string[] = [];
    const testAccount: TestAzureAccount = new TestAzureAccount(vscode);
    //let apiManagementClient: ApiManagementClient;
    //const resourceName1: string = `vscode-${getRandomHexString().toLowerCase()}`;

    suiteSetup(async function (this: Context): Promise<void> {
        if (!longRunningTestsEnabled) {
            this.skip();
        }

        this.timeout(120 * 1000);
        await testAccount.signIn();
        ext.azureAccountTreeItem = new AzureAccountTreeItem(testAccount);
        ext.tree = new AzExtTreeDataProvider(ext.azureAccountTreeItem, 'azureApiManagement.LoadMore');
        const rootNode : AzExtParentTreeItem = await treeUtils.getRootNode(ext.tree);
        rootNode.subscription.userId = "vscodeapimtest@microsoft.com"; // userId doesnt exist for service principal.
        //apiManagementClient = getApiManagementClient(testAccount);
    });

    suiteTeardown(async function (this: Context): Promise<void> {
        if (!longRunningTestsEnabled) {
            this.skip();
        }
        this.timeout(1200 * 1000);

        const client: ResourceManagementClient = await getResourceManagementClient(testAccount);
        for (const resourceGroup of resourceGroupsToDelete) {
            if (await client.resourceGroups.checkExistence(resourceGroup) !== undefined) {
                console.log(`Deleting resource group "${resourceGroup}"...`);
                await client.resourceGroups.deleteMethod(resourceGroup);
                console.log(`Resource group "${resourceGroup}" deleted.`);
            } else {
                // If the test failed, the resource group might not actually exist
                console.log(`Ignoring resource group "${resourceGroup}" because it does not exist.`);
            }
        }
        ext.azureAccountTreeItem.dispose();
    });

    /*
    test('createApiManagementService (Default)', async () => {
        resourceGroupsToDelete.push(resourceName1);
        await runWithApimSetting('advancedCreation', undefined, async () => {
            ext.ui = new TestUserInput([resourceName1]);
            await vscode.commands.executeCommand('azureApiManagement.createService');
            const createdService: ApiManagementModels.ApiManagementServiceResource = await apiManagementClient.apiManagementService.get(resourceName1, resourceName1);
            assert.ok(createdService);
        });
    });*/
});

// function getApiManagementClient(testAccount: TestAzureAccount): ApiManagementClient {
//     return new ApiManagementClient(testAccount.getSubscriptionCredentials(), testAccount.getSubscriptionId());
// }

async function getResourceManagementClient(testAccount: TestAzureAccount): Promise<ResourceManagementClient> {
    const subscriptionContext: ISubscriptionContext = testAccount.getSubscriptionContext();
    const creds = getCredentialForToken(await subscriptionContext.credentials.getToken());
    return new ResourceManagementClient(creds, subscriptionContext.subscriptionId);
}

function getCredentialForToken(accessToken: any) {
    return {
      signRequest: (request: any) => {
        if (!request.headers) {request.headers = new HttpHeaders();}
        request.headers.set("Authorization", `Bearer ${accessToken.token}`);
        return Promise.resolve(request);
      }
    };
}