/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ServiceClientOptions } from "@azure/ms-rest-js";

const userAgentValue = "vscode-apimanagement";

export const clientOptions: ServiceClientOptions = {
    userAgent: (defaultUserAgent: string) => {
        return `${userAgentValue} ${defaultUserAgent}`;
    }
};
