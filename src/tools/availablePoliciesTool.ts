/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as path from 'path';
import { ext } from '../extensionVariables';
import { callWithTelemetryAndErrorHandling, IActionContext } from '@microsoft/vscode-azext-utils';
import { readFileAsync } from '../utils/fileUtils';

export class AvailablePoliciesTool implements vscode.LanguageModelTool<{}> {
    private static cachedPolicyList: string;

    async prepareInvocation(
        _options: vscode.LanguageModelToolInvocationPrepareOptions<{}>,
        _token: vscode.CancellationToken
    ) {
        return {
            invocationMessage: 'Getting available APIM policies'
        };
    }

    async invoke(
        _options: vscode.LanguageModelToolInvocationOptions<{}>,
        _token: vscode.CancellationToken
    ): Promise<vscode.LanguageModelToolResult> {
        let err: Error | undefined = undefined;
        const result = await callWithTelemetryAndErrorHandling<vscode.LanguageModelToolResult>("lmtool.get-available-apim-policies.invoke", async (_context: IActionContext) => {
            try {
                if (!AvailablePoliciesTool.cachedPolicyList) {
                    const policiesPath = ext.context.asAbsolutePath(path.join('resources', 'knowledgeBase', 'policies.json'));
                    const policiesContent = await readFileAsync(policiesPath, 'utf8');
                    const policies = JSON.parse(policiesContent);
                    AvailablePoliciesTool.cachedPolicyList = Object.entries(policies)
                        .map(([name, description]) => `${name}: ${description}`)
                        .join('\n');
                }

                return new vscode.LanguageModelToolResult([
                    new vscode.LanguageModelTextPart('Here are all available APIM policies:\n\n' + AvailablePoliciesTool.cachedPolicyList)
                ]);
            } catch (error) {
                err = error;
                throw error; // throw the error to be caught by the telemetry handler
            }
        });

        if (result === undefined) {
            throw err; // throw the error when tool invoke failed
        }

        return result;
    }
}