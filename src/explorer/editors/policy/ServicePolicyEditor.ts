/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { AzureTreeItem } from "vscode-azureextensionui";
import { emptyGlobalPolicyXml, policyFormat } from "../../../constants";
import { IServiceTreeRoot } from "../../IServiceTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";

export class ServicePolicyEditor extends BasePolicyEditor<IServiceTreeRoot> {
    public async getPolicy(context: AzureTreeItem<IServiceTreeRoot>): Promise<string> {
        const policy =  await context.root.client.policy.get(context.root.resourceGroupName, context.root.serviceName, { format: policyFormat });
        return policy.value;
    }

    public async updatePolicy(context: AzureTreeItem<IServiceTreeRoot>, policy: ApiManagementModels.PolicyContract): Promise<string> {
       const policyResult = await context.root.client.policy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, policy);
       return policyResult.value;
    }

    public getDefaultPolicy() : string {
        return emptyGlobalPolicyXml;
    }
}
