/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IClientOptions } from "./azureServiceClient";

const userAgentValue = "vscode-apimanagement";

export const clientOptions: IClientOptions = {
    userAgent: (defaultUserAgent: string) => {
        return `${userAgentValue} ${defaultUserAgent}`;
    }
};
