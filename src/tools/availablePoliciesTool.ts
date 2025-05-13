/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { ext } from '../extensionVariables';

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
        try {
            if (!AvailablePoliciesTool.cachedPolicyList) {
                const policiesPath = ext.context.asAbsolutePath(path.join('resources', 'knowledgeBase', 'policies.json'));
                const policiesContent = await fs.readFile(policiesPath, 'utf8');
                const policies = JSON.parse(policiesContent);
                AvailablePoliciesTool.cachedPolicyList = Object.entries(policies)
                    .map(([name, description]) => `${name}: ${description}`)
                    .join('\n');
            }

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart('Here are all available APIM policies:\n\n' + AvailablePoliciesTool.cachedPolicyList)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error retrieving policies: ${error.message}`)
            ]);
        }
    }
}