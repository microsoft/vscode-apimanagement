/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PolicyContract } from "@azure/arm-apimanagement";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";
import { emptyPolicyXml, policyFormat } from "../../../constants";
import { IOperationTreeRoot } from "../../IOperationTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";

export class OperationPolicyEditor extends BasePolicyEditor<IOperationTreeRoot> {
    public async getPolicy(context: ITreeItemWithRoot<IOperationTreeRoot>): Promise<string> {
        // The policy id should be `policy` per https://learn.microsoft.com/en-us/rest/api/apimanagement/api-operation-policy/get?view=rest-apimanagement-2024-05-01&tabs=HTTP
        const policy =  await context.root.client.apiOperationPolicy.get(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, context.root.opName, 'policy', { format: policyFormat });
        return policy.value!;
    }

    public async updatePolicy(context: ITreeItemWithRoot<IOperationTreeRoot>, policy: PolicyContract): Promise<string> {
        // The policy id should be `policy` per https://learn.microsoft.com/en-us/rest/api/apimanagement/api-operation-policy/create-or-update?view=rest-apimanagement-2024-05-01&tabs=HTTP
       const policyResult = await context.root.client.apiOperationPolicy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, context.root.apiName, context.root.opName, 'policy', policy);
       return policyResult.value!;
    }

    public getDefaultPolicy() : string {
        return emptyPolicyXml;
    }
}
