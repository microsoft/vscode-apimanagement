/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { AzureTreeItem } from "vscode-azureextensionui";
import { emptyPolicyXml, policyFormat } from "../../../constants";
import { IOperationTreeRoot } from "../../IOperationTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";

export class OperationPolicyEditor extends BasePolicyEditor<IOperationTreeRoot> {
    public async getPolicy(context: AzureTreeItem<IOperationTreeRoot>): Promise<string> {
        const policy =  await context.root.client.apiOperationPolicy.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, context.root.opName, { format: policyFormat });
        return policy._response.bodyAsText;
    }

    public async updatePolicy(context: AzureTreeItem<IOperationTreeRoot>, policy: ApiManagementModels.PolicyContract): Promise<string> {
       const policyResult = await context.root.client.apiOperationPolicy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, context.root.opName, policy);
       return policyResult._response.bodyAsText;
    }

    public getDefaultPolicy() : string {
        return emptyPolicyXml;
    }
}
