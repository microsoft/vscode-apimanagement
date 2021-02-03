/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ApiManagementModels } from "@azure/arm-apimanagement";
import { AzureTreeItem } from "vscode-azureextensionui";
import { emptyPolicyXml, policyFormat } from "../../../constants";
import { IApiTreeRoot } from "../../IApiTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";

export class ApiPolicyEditor extends BasePolicyEditor<IApiTreeRoot> {
    public async getPolicy(context: AzureTreeItem<IApiTreeRoot>): Promise<string> {
        const policy =  await context.root.client.apiPolicy.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, { format: policyFormat });
        return policy.value;
    }

    public async updatePolicy(context: AzureTreeItem<IApiTreeRoot>, policy: ApiManagementModels.PolicyContract): Promise<string> {
       const policyResult = await context.root.client.apiPolicy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, policy);
       return policyResult.value;
    }

    public getDefaultPolicy() : string {
        return emptyPolicyXml;
    }
}
