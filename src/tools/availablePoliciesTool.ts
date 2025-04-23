import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ext } from '../extensionVariables';

export class AvailablePoliciesTool implements vscode.LanguageModelTool<{}> {
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
            const policiesPath = ext.context.asAbsolutePath(path.join('resources', 'knowledgeBase', 'policies.json'));
            const policiesContent = fs.readFileSync(policiesPath, 'utf8');
            const policies = JSON.parse(policiesContent);

            const policyList = Object.entries(policies)
                .map(([name, description]) => `${name}: ${description}`)
                .join('\n\n');

            console.log(policyList)

            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart('Here are all available APIM policies:\n\n' + policyList)
            ]);
        } catch (error) {
            return new vscode.LanguageModelToolResult([
                new vscode.LanguageModelTextPart(`Error retrieving policies: ${error.message}`)
            ]);
        }
    }
}