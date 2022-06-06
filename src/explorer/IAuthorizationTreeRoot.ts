/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAuthorizationProviderTreeRoot } from "./IAuthorizationProviderTreeRoot";

export interface IAuthorizationTreeRoot extends IAuthorizationProviderTreeRoot {
    authorizationName: string;
}
