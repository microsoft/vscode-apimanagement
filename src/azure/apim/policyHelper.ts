/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// tslint:disable-next-line: export-name
export function getSetMethodPolicy(method: string): object {
    return {
        "set-method": [method]
    };
}

export function getRewriteUrlPolicy(triggerUrl: string): object {
    return {
        "rewrite-uri": [
            {
                _attr: {
                    id: "apim-generated-policy",
                    template: triggerUrl
                }
            }
        ]
    };
}

export function getSetHeaderPolicy(name: string, existsAction: string, headerValues: string[]): object {
    const setHeaderChildren: object[] = [];
    setHeaderChildren.push({
        _attr: {
            id: "apim-generated-policy",
            name: name,
            "exists-action": existsAction
        }
    });
    for (const headerValue of headerValues) {
        setHeaderChildren.push({
            value: headerValue
        });
    }
    return {
        "set-header": setHeaderChildren
    };
}

export function getSetBackendPolicy(backendId: string): object {
    return {
        "set-backend-service": [
            {
                _attr: {
                    id: "apim-generated-policy",
                    "backend-id": backendId
                }
            }
        ]
    };
}
