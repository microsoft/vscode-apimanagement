/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureTreeItem } from "vscode-azureextensionui";
import { ApimService } from "../../../azure/apim/ApimService";
import { IAuthorizationAccessPolicyContract } from "../../../azure/apim/contracts";

import { nonNullValue } from "../../../utils/nonNull";
import { IAuthorizationAccessPolicyTreeRoot } from "../../IAuthorizationAccessPolicyTreeRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";

// tslint:disable-next-line:no-any
export class AuthorizationAccessPolicyResourceEditor extends BaseArmResourceEditor<IAuthorizationAccessPolicyTreeRoot>  {
    public entityType: string = "AuthorizationAccessPolicy";
    constructor() {
        super();
    }

    public async getDataInternal(context: AzureTreeItem<IAuthorizationAccessPolicyTreeRoot>): Promise<IAuthorizationAccessPolicyContract>  {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName);

        const response = await apimService.getAuthorizationAccessPolicy(context.root.authorizationProviderName, context.root.authorizationName, context.root.accessPolicyName);
        return nonNullValue(response);
    }

    public async updateDataInternal(context: AzureTreeItem<IAuthorizationAccessPolicyTreeRoot>, payload: IAuthorizationAccessPolicyContract): Promise<IAuthorizationAccessPolicyContract> {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName);

        const response = await apimService.createAuthorizationAccessPolicy(context.root.authorizationProviderName, context.root.authorizationName, context.root.accessPolicyName, payload.properties);
        return nonNullValue(response);
    }
}
