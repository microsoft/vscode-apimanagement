// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { ServiceClientOptions } from "@azure/ms-rest-js";

const userAgentValue = "vscode-apimanagement";

export const clientOptions: ServiceClientOptions = {
    userAgent: (defaultUserAgent: string) => {
        return `${userAgentValue} ${defaultUserAgent}`;
    }
};
