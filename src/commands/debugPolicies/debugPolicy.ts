/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ApiOperationTreeItem } from '../../explorer/ApiOperationTreeItem';
import { ext } from "../../extensionVariables";
import { nameUtil } from '../../utils/nameUtil';

// tslint:disable: no-unsafe-any
// tslint:disable-next-line: export-name
export async function debugApiPolicy(node?: ApiOperationTreeItem): Promise<void> {
    if (!node) {
        node = <ApiOperationTreeItem>await ext.tree.showTreeItemPicker(ApiOperationTreeItem.contextValue);
    }

    // tslint:disable-next-line: no-non-null-assertion
    const gatewayAddress = getDebugGatewayAddressUrl(node!.root.serviceName);
    const managementUrl = `${node.root.environment.resourceManagerEndpointUrl}/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/microsoft.apimanagement/service/${node.root.serviceName}`;
    //const mode = "development";

    const operationData = await node.getOperationDebugInfo();
    const debugConfig: vscode.DebugConfiguration = {
        type: "apim-policy",
        request: "launch",
        name: "Attach to APIM",
        stopOnEntry: true,
        gatewayAddress: gatewayAddress,
        managementAddress: managementUrl,
        subscriptionId: node.root.subscriptionId,
        operationData: operationData,
        fileName: `${nameUtil(node.root)}.http`
    };

    // const debugConfig2: vscode.DebugConfiguration = {
    //     type: "apim-policy",
    //     request: "launch",
    //     name: "Attach to APIM",
    //     stopOnEntry: true,
    //     gatewayAddress: 'wss://lrptest.preview.int-azure-api.net/debug-0123456789abcdef',
    //     managementAddress: 'https://api-dogfood.resources.windows-int.net/subscriptions/b8ff56dc-3bc7-4174-a1e8-3726ab15d0e2/resourceGroups/Admin-ResourceGroup/providers/Microsoft.ApiManagement/service/lrptest',
    //     managementAuth: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6InVmbkMtb2ZGX3FfQ0NTaVFMb2M5a1FLcVowQSIsImtpZCI6InVmbkMtb2ZGX3FfQ0NTaVFMb2M5a1FLcVowQSJ9.eyJhdWQiOiJodHRwczovL21hbmFnZW1lbnQuY29yZS53aW5kb3dzLm5ldC8iLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLXBwZS5uZXQvZjY4NmQ0MjYtOGQxNi00MmRiLTgxYjctYWI1NzhlMTEwY2NkLyIsImlhdCI6MTU4OTMyOTQ2OCwibmJmIjoxNTg5MzI5NDY4LCJleHAiOjE1ODkzMzMzNjgsIl9jbGFpbV9uYW1lcyI6eyJncm91cHMiOiJzcmMxIn0sIl9jbGFpbV9zb3VyY2VzIjp7InNyYzEiOnsiZW5kcG9pbnQiOiJodHRwczovL2dyYXBoLnBwZS53aW5kb3dzLm5ldC9mNjg2ZDQyNi04ZDE2LTQyZGItODFiNy1hYjU3OGUxMTBjY2QvdXNlcnMvYmVjNzY3YWItYzM0Mi00NjRmLWE4ZmItZjc3NzIxZDBmZTgwL2dldE1lbWJlck9iamVjdHMifX0sImFjciI6IjEiLCJhaW8iOiJBVlFBcS84U0FBQUFubEtBT1YxZ2VDYU1UYkNXM3VTM09rRGxtTk5xRm95cHJNaDV2ajVwUjJ6SVBoNzU1TXRScjh0V1M3MFpSR2hiUXI2SnlYNmZHNXFseEtrS2RkblloRmtiOFdKVEFDV3dpKysrem15UGFHaz0iLCJhbXIiOlsicnNhIiwibWZhIl0sImFwcGlkIjoiYzQ0YjQwODMtM2JiMC00OWMxLWI0N2QtOTc0ZTUzY2JkZjNjIiwiYXBwaWRhY3IiOiIyIiwiZmFtaWx5X25hbWUiOiJMaXUiLCJnaXZlbl9uYW1lIjoiUnVwZW5nIiwiaXBhZGRyIjoiNTAuNDcuMTEzLjQyIiwibmFtZSI6IlJ1cGVuZyBMaXUiLCJvaWQiOiJiZWM3NjdhYi1jMzQyLTQ2NGYtYThmYi1mNzc3MjFkMGZlODAiLCJvbnByZW1fc2lkIjoiUy0xLTUtMjEtMjEyNzUyMTE4NC0xNjA0MDEyOTIwLTE4ODc5Mjc1MjctMzcyMzU0OTYiLCJwdWlkIjoiMTAwM0RGRkQwMDBGNDRFNCIsInNjcCI6InVzZXJfaW1wZXJzb25hdGlvbiIsInN1YiI6IjJqWHpHazdhQzFYNXlTODJQVzBENC1qRUJUT0t0cjN5WjhPdHBZMURNMm8iLCJ0aWQiOiJmNjg2ZDQyNi04ZDE2LTQyZGItODFiNy1hYjU3OGUxMTBjY2QiLCJ1bmlxdWVfbmFtZSI6InJ1cGxpdUBtaWNyb3NvZnQuY29tIiwidXBuIjoicnVwbGl1QG1pY3Jvc29mdC5jb20iLCJ1dGkiOiJ1c0RSTnJjTjhVSzV0WU1qdUlnR0FBIiwidmVyIjoiMS4wIn0.cb8SachP72aFx9UpaZOdnm5UW3Znuo_yc2AV70S3KLdakniLFinI2UMcQDpjp5_7Fbjs9CwWiG89P_9pS4T81M1B54UB-MalP8EyqLlWRQ8kQizypqVD9RoNsLXzQk2-Qzi2MmFqP7jjqRSiJRZDlkMppiDc19_X97UrmK_WBATrvy8VpFsaxLGcshIqDaLfSzHYwfO6z5bF30e9oLDpsIbNvzTcKvSscrntlblnYEwZPxu1PX-ZA9TAqpt8ZZzsdDk0ORQiJQ6qki_kUJ66VtvZZ0Uj5p9vETNRsPd27_au_k360x30yOJeeCjT_Hcw16MeZMYt4NO5_M3lPOvN6Q',
    //     operationData: getLocalDebugOperationData1(),
    //     fileName: `test.http`
    // };

    // const debugConfig3: vscode.DebugConfiguration = {
    //     type: "apim-policy",
    //     request: "launch",
    //     name: "Attach to APIM",
    //     stopOnEntry: true,
    //     gatewayAddress: 'wss://proxy.apim.net/debug-0123456789abcdef',
    //     managementAddress: 'https://management.apim.net/subscriptions/x/resourceGroups/x/providers/microsoft.apimanagement/service/x',
    //     managementAuth: 'SharedAccessSignature integration&202009301703&Ru/q/gwBrph0DDYHCo6DSRj3wpyeb8sZIlLCX26zpSYXkb46KCp8OLA0m2qmuD1XetjfzM3Y9njnTOuW5SSH5A==',
    //     operationData: getLocalDebugOperationData2(),
    //     fileName: `${nameUtil(node.root)}.http`
    // };

    // tslint:disable-next-line: no-non-null-assertion
    // const httpFileEditor = await createOperationTestFile(node!, OperationRunMode.debug);
    // vscode.debug.onDidTerminateDebugSession(_ => {
    //     httpFileEditor.hide();
    // });
    //httpFileEditor.hide();
    if (!vscode.debug.activeDebugSession) {
        await vscode.debug.startDebugging(undefined, debugConfig);
        // if (mode === "development") {
        //     await vscode.debug.startDebugging(undefined, debugConfig3);
        // } else {
        //     await vscode.debug.startDebugging(undefined, debugConfig);
        // }
        vscode.debug.onDidTerminateDebugSession(_ => {
            //vscode.commands.executeCommand('workbench.action.closeActiveEditor');
            //httpFileEditor.hide();
            const editors = vscode.window.visibleTextEditors;
            editors.forEach(editor => {
                //vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                editor.hide();
            });
        },                                      vscode.debug.activeDebugSession);
    }
}

export function getLocalDebugOperationData1(): string {
    return `
GET https://lrptest.preview.int-azure-api.net/echo/resource
Ocp-Apim-Subscription-Key: 6af95f451f054158997e3755c4e2c6e7
Ocp-Apim-Debug: 6af95f451f054158997e3755c4e2c6e7
x-test: 12345`;
}

export function getLocalDebugOperationData2(): string {
    return `
GET https://proxy.apim.net/echo/resource
Ocp-Apim-Subscription-Key: c1fe6a5605744bb7ab51c5a815a412cd
Ocp-Apim-Debug: c1fe6a5605744bb7ab51c5a815a412cd`;
}

export function getDebugGatewayAddressUrl(serviceName: string): string {
    return `wss://${serviceName}.azure-api.net/debug-0123456789abcdef`;
}

export function getDebugGatewayAddressDogfoodUrl(serviceName: string): string {
    return `wss://${serviceName}.preview.int-azure-api.net/debug-0123456789abcdef`;
}

export function getTempDogfoodUrl(): string {
    return `wss://alzaslontests04.preview.int-azure-api.net/debug-0123456789abcdef`;
}

export function getDebugGatewayAddressDogfoodUrl2(serviceName: string): string {
    return `wss://${serviceName}.current.int-azure-api.net/debug-0123456789abcdef`;
}

export interface IAuthenticationToken {
    value: string;
}

export interface IUser {
    id: string;
    primaryKey: string;
    secondaryKey: string;
    enabled: boolean;
}
