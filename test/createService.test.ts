// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the MIT License. See License.txt in the project root for license information.
//  *--------------------------------------------------------------------------------------------*/

// import { ResourceManagementClient } from '@azure/arm-resources';
// import { TestAzureAccount } from '@microsoft/vscode-azext-dev';
// import { AzExtParentTreeItem } from '@microsoft/vscode-azext-utils';
// import { ext, treeUtils } from '../extension.bundle';
// import { HttpHeaders } from '@azure/ms-rest-js';
// import * as vscode from 'vscode';

// let longRunningTestsEnabled = !/^(false|0)?$/i.test(process.env.ENABLE_LONG_RUNNING_TESTS || '');

// describe('Create Azure Resources', function() {
//     this.timeout(1200 * 1000);
//     const resourceGroupsToDelete: string[] = [];
//     let testAccount: TestAzureAccount;

//     before(async function() {
//         if (!longRunningTestsEnabled) {
//             this.skip();
//         }

//         this.timeout(120 * 1000);
//         testAccount = new TestAzureAccount(vscode);
//         await testAccount.signIn();
//         const rootNode : AzExtParentTreeItem = await treeUtils.getRootNode(ext.tree);
//         rootNode.subscription.userId = "vscodeapimtest@microsoft.com"; // userId doesnt exist for service principal.
//     });

//     after(async function() {
//         if (!longRunningTestsEnabled) {
//             this.skip();
//         }
//         this.timeout(1200 * 1000);

//         const client: ResourceManagementClient = await getResourceManagementClient(testAccount);
//         for (const resourceGroup of resourceGroupsToDelete) {
//             if (await client.resourceGroups.checkExistence(resourceGroup) !== undefined) {
//                 console.log(`Deleting resource group "${resourceGroup}"...`);
//                 await client.resourceGroups.deleteMethod(resourceGroup);
//                 console.log(`Resource group "${resourceGroup}" deleted.`);
//             } else {
//                 // If the test failed, the resource group might not actually exist
//                 console.log(`Ignoring resource group "${resourceGroup}" because it does not exist.`);
//             }
//         }
//         ext.azureAccountTreeItem.dispose();
//     });
// });

// async function getResourceManagementClient(testAccount: TestAzureAccount): Promise<ResourceManagementClient> {
//     const subscriptionContext = testAccount.getSubscriptionContext();
//     const creds = getCredentialForToken(await subscriptionContext.credentials.getToken());
//     return new ResourceManagementClient(creds, subscriptionContext.subscriptionId);
// }

// function getCredentialForToken(accessToken: any) {
//     return {
//       signRequest: (request: any) => {
//         if (!request.headers) {request.headers = new HttpHeaders();}
//         request.headers.set("Authorization", `Bearer ${accessToken.token}`);
//         return Promise.resolve(request);
//       }
//     };
// }