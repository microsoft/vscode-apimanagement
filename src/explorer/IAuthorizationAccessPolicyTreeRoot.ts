/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAuthorizationTreeRoot } from "./IAuthorizationTreeRoot";

export interface IAuthorizationAccessPolicyTreeRoot extends IAuthorizationTreeRoot {
    accessPolicyName: string;
}
