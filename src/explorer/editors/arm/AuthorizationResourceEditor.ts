/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ITreeItemWithRoot } from "../../ITreeItemWithRoot";
import { ApimService } from "../../../azure/apim/ApimService";
import { IAuthorizationContract } from "../../../azure/apim/contracts";

import { nonNullValue } from "../../../utils/nonNull";
import { IAuthorizationTreeRoot } from "../../IAuthorizationTreeRoot";
import { BaseArmResourceEditor } from "./BaseArmResourceEditor";

// tslint:disable-next-line:no-any
export class AuthorizationResourceEditor extends BaseArmResourceEditor<IAuthorizationTreeRoot>  {
    public entityType: string = "Authorization";
    constructor() {
        super();
    }

    public async getDataInternal(context: ITreeItemWithRoot<IAuthorizationTreeRoot>): Promise<IAuthorizationContract>  {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName);

        const response = await apimService.getAuthorization(context.root.authorizationProviderName, context.root.authorizationName);
        return nonNullValue(response);
    }

    public async updateDataInternal(context: ITreeItemWithRoot<IAuthorizationTreeRoot>, payload: IAuthorizationContract): Promise<IAuthorizationContract> {
        const apimService = new ApimService(
            context.root.credentials,
            context.root.environment.resourceManagerEndpointUrl,
            context.root.subscriptionId,
            context.root.resourceGroupName,
            context.root.serviceName);

        const response = await apimService.createAuthorization(context.root.authorizationProviderName, context.root.authorizationName, payload.properties);
        return nonNullValue(response);
    }
}
