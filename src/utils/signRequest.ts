/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import {  WebResource } from "ms-rest";

export async function signRequest(req: WebResource, cred: TokenCredentialsBase): Promise<void> {
    await new Promise((resolve: () => void, reject: (err: Error) => void): void => {
        cred.signRequest(req, (err: Error | undefined) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}
