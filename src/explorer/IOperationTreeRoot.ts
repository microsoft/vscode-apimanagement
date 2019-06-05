/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IApiTreeRoot } from "./IApiTreeRoot";

export interface IOperationTreeRoot extends IApiTreeRoot {
    opName: string;
}
