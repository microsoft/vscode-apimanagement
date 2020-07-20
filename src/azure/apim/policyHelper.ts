/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// tslint:disable-next-line: export-name
export function getSetMethodPolicy(method: string): Object {
    return {
        "set-method": [method]
    };
}

export function getRewriteUrlPolicy(triggerUrl: string): Object {
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

export function getSetHeaderPolicy(name: string, existsAction: string, headerValues: string[]): Object {
    const setHeaderChildren: Object[] = [];
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

export function getSetBackendPolicy(backendId: string): Object {
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
