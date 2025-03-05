/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";
import { ApimService } from "../../../azure/apim/ApimService";
import { IAuthorizationProviderContract } from "../../../azure/apim/contracts";
import { nonNullValue } from "../../../utils/nonNull";
import { IAuthorizationProviderTreeRoot } from "../../IAuthorizationProviderTreeRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";

// tslint:disable-next-line:no-any
export class AuthorizationProviderResourceEditor extends BaseArmResourceEditor<IAuthorizationProviderTreeRoot>  {
    public entityType: string = "CredentialManager";
    constructor() {
        super();
    }

    public async getDataInternal(context: ITreeItemWithRoot<IAuthorizationProviderTreeRoot>): Promise<IAuthorizationProviderContract>  {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName);

        const response = await apimService.getAuthorizationProvider(context.root.authorizationProviderName);
        return nonNullValue(response);
    }

    public async updateDataInternal(context: ITreeItemWithRoot<IAuthorizationProviderTreeRoot>, payload: IAuthorizationProviderContract): Promise<IAuthorizationProviderContract> {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName);

        const response = await apimService.createAuthorizationProvider(context.root.authorizationProviderName, payload.properties);
        return nonNullValue(response);
    }
}
