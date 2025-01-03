/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PolicyContract } from "@azure/arm-apimanagement";
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";
import { emptyGlobalPolicyXml, policyFormat } from "../../../constants";
import { IServiceTreeRoot } from "../../IServiceTreeRoot";
import { BasePolicyEditor } from "./BasePolicyEditor";

export class ServicePolicyEditor extends BasePolicyEditor<IServiceTreeRoot> {
    public async getPolicy(context: ITreeItemWithRoot<IServiceTreeRoot>): Promise<string> {
        // The policy id should be `policy` per https://learn.microsoft.com/en-us/rest/api/apimanagement/policy/get?view=rest-apimanagement-2024-05-01&tabs=HTTP
        const policy =  await context.root.client.policy.get(context.root.resourceGroupName, context.root.serviceName, 'policy', { format: policyFormat });
        return policy.value!;
    }

    public async updatePolicy(context: ITreeItemWithRoot<IServiceTreeRoot>, policy: PolicyContract): Promise<string> {
        // The policy id should be `policy` per https://learn.microsoft.com/en-us/rest/api/apimanagement/policy/create-or-update?view=rest-apimanagement-2024-05-01&tabs=HTTP
       const policyResult = await context.root.client.policy.createOrUpdate(context.root.resourceGroupName, context.root.serviceName, 'policy', policy);
       return policyResult.value!;
    }

    public getDefaultPolicy() : string {
        return emptyGlobalPolicyXml;
    }
}
