/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthenticationSettingsContract, Protocol, SubscriptionKeyParameterNamesContract } from "@azure/arm-apimanagement/src/models";

export interface IApiContract {
    id: string;
    name: string;
    properties: {
        displayName: string;
        apiRevision: string;
        authenticationSettings?: AuthenticationSettingsContract;
        description: string;
        isCurrent: boolean;
        path: string;
        protocols?: Protocol[];
        serviceUrl: string;
        subscriptionKeyParameterNames?: SubscriptionKeyParameterNamesContract;
        subscriptionRequired?: boolean;
        // tslint:disable-next-line: no-reserved-keywords
        type: string;
    };
}
