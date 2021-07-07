/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GraphQLFieldMap, GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLScalarType } from 'graphql';
import requestPromise from 'request-promise';
import * as vscode from 'vscode';
import { IActionContext } from "vscode-azureextensionui";
import { IApiContract } from '../azure/apim/TempApiContract';
import { SharedAccessToken } from '../constants';
import { GraphqlObjectTypeTreeItem } from "../explorer/GraphqlObjectTypeTreeItem";
import { ext } from "../extensionVariables";
import { createTemporaryFile } from "../utils/fsUtil";
import { writeToEditor } from '../utils/vscodeUtils';

export async function showGraphqlAPIQuery(actionContext: IActionContext, node?: GraphqlObjectTypeTreeItem): Promise<void> {
    if (!node) {
        node = <GraphqlObjectTypeTreeItem>await ext.tree.showTreeItemPicker(GraphqlObjectTypeTreeItem.contextValue, actionContext);
    }

    const query = node.object;
    const fileName: string = node.root.apiName.concat("-").concat(query.name).concat(".http");
    const localFilePath: string = await createTemporaryFile(fileName);
    let data = "";
    const requestOptions : requestPromise.RequestPromiseOptions = {
        method: "GET",
        headers: {
            Authorization: SharedAccessToken
        }
    };
    const apiContractString = await <Thenable<string>>requestPromise(`https://${node.root.serviceName}.management.preview.int-azure-api.net/subscriptions/${node.root.subscriptionId}/resourceGroups/${node.root.resourceGroupName}/providers/Microsoft.ApiManagement/service/${node.root.serviceName}/apis/${node.root.apiName}?api-version=2021-04-01-preview`, requestOptions).promise();
    // tslint:disable-next-line: no-unsafe-any
    const apiTemp : IApiContract = JSON.parse(apiContractString);
    let queryBuilder = "";
    const serviceUrl = apiTemp.properties.serviceUrl;
    const args = query.args;
    let argParams = "";
    let fieldStr = "";
    for (const arg of args) {
        if (arg.type instanceof GraphQLScalarType) {
            argParams = argParams.concat("$").concat(arg.name).concat(": ").concat(arg.type.name).concat(", ");
        } else if (arg.type instanceof GraphQLNonNull && arg.type.ofType instanceof GraphQLScalarType) {
            argParams = argParams.concat("$").concat(arg.name).concat(": ").concat(arg.type.ofType.name).concat("!").concat(", ");
        } else if (arg.type instanceof GraphQLInputObjectType) {
            let fieldsStr = "";
            const argFields = arg.type.getFields();
            for (const argKey of Object.keys(argFields)) {
                const argValue = argFields[argKey];
                if (argValue.type instanceof GraphQLScalarType) {
                    fieldsStr = fieldsStr.concat(`${argValue.name}: ${argValue.type.name}`);
                }
            }
            const subArgs = `${arg.name}: { ${fieldsStr} }`;
            argParams = argParams.concat("$").concat(subArgs).concat(", ");
        }
    }

    if (query.type instanceof GraphQLObjectType) {
        fieldStr = fieldStr.concat(getFields(query.type.getFields()));
    } else if (query.type instanceof GraphQLList && query.type.ofType instanceof GraphQLObjectType) {
        fieldStr = fieldStr.concat(getFields(query.type.ofType.getFields()));
    }

    queryBuilder = queryBuilder.concat(` query(${argParams}) \n`).concat(`\t{ ${query.name} (${argParams}) \n\t {${fieldStr}}}`);

    const document: vscode.TextDocument = await vscode.workspace.openTextDocument(localFilePath);
    //await fse.writeFile(localFilePath, data);
    const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(document);
    data = data.concat("Post ").concat(serviceUrl).concat("\n\n").concat(`{ "query": "${queryBuilder}","variables":{}}`);
    // tslint:disable-next-line: strict-boolean-expressions
    if (!!textEditor) {
        await writeToEditor(textEditor, data);
        await textEditor.document.save();
    }
    vscode.commands.executeCommand('setContext', 'isEditorEnabled', true);
}

// tslint:disable-next-line: no-any
function getFields(fields: GraphQLFieldMap<any, any>): string {
    let resStr = "";
    for (const fieldKey of Object.keys(fields)) {
        const fieldValue = fields[fieldKey];
        resStr =  resStr.concat(fieldValue.name);
        if (fieldValue.type instanceof GraphQLObjectType) {
            resStr.concat(": ");
            const childStr = getFields(fieldValue.type.getFields());
            resStr = resStr.concat("{").concat(childStr).concat("}");
        } else {
            resStr.concat(", ");
        }
    }
    return resStr;
}
