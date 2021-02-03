/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ParameterContract } from "@azure/arm-apimanagement/src/models";

export function parseUrlTemplate(uriTemplate: string): {
    parameters: ParameterContract[],
    urlTemplate: string
} {
    let cleanTemplate = "";
    const parameters: ParameterContract[] = [];

    let templateStart = 0;
    let parameterStart = 0;
    let parameterDepth = 0;
    for (let i = 0; i < uriTemplate.length; i++) {
        if (uriTemplate[i] === "{") {
            if (parameterDepth === 0) {
                parameterStart = i + 1;
            }
            parameterDepth++;
            cleanTemplate += uriTemplate.substring(templateStart, i);
            templateStart = i;
        } else if (uriTemplate[i] === "}" && --parameterDepth === 0) {
            if (parameterStart < i) {
                const parameter = parseParameter(uriTemplate.substring(parameterStart, i));
                cleanTemplate += `{${parameter.name}}`;
                parameters.push(parameter);
            }
            templateStart = i + 1;
        }
    }

    cleanTemplate += uriTemplate.substring(templateStart);

    return {
        urlTemplate: cleanTemplate,
        parameters: parameters
    };
}

function parseParameter(param: string): ParameterContract {
    const nameAndType = param.split(/:|=|\?/, 3);
    const defaultValue = param.split("=", 3);

    const parameter: ParameterContract = {
        name: nameAndType[0].startsWith("*") ? nameAndType[0].substr(1) : nameAndType[0],
        type: nameAndType.length > 1 ? mapParameterType(nameAndType[1]) : "",
        required: !param.endsWith("?")
    };

    if (defaultValue.length > 1) {
        parameter.defaultValue = defaultValue[1].endsWith("?") ? defaultValue[1].substr(0, defaultValue[1].length - 1) : defaultValue[1];
    }

    return parameter;
}

// tslint:disable-next-line: no-reserved-keywords
function mapParameterType(type: string): string {
    // Maps URI template constraint (https://docs.microsoft.com/aspnet/web-api/overview/web-api-routing-and-actions/attribute-routing-in-web-api-2#constraints)
    // to an OpenAPI parameter type (https://github.com/OAI/OpenAPI-Specification/blob/master/versions/2.0.md#parameterObject)
    switch (type) {
        case "alpha":
        case "datetime":
        case "guid":
            return "string";
        case "decimal":
        case "float":
        case "double":
            return "number";
        case "int":
        case "long":
            return "integer";
        case "bool":
            return "boolean";
        default:
            if (type.startsWith("length(") || type.startsWith("maxlength(") || type.startsWith("minlength(") || type.startsWith("regex(")) {
                return "string";
            }
            if (type.startsWith("min(") || type.startsWith("max(") || type.startsWith("range(")) {
                return "integer";
            }
            return "";
    }
}
