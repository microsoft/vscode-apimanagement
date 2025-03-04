/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { loadPromptTemplate } from '../utils/promptUtils';
import { ext } from '../extensionVariables';

export async function draftPolicy(_context: IActionContext): Promise<void> {
    // Load policies knowledge base
    const policiesPath = path.join(ext.context.extensionPath, 'resources', 'knowledgeBase', 'policies.json');
    const policies = fs.readFileSync(policiesPath, 'utf8');
    
    // Create prompt with policies knowledge base as context
    const prompt = loadPromptTemplate('draftPolicy.md', { policies });
    
    // Open Copilot Chat with the prepared prompt
    await vscode.commands.executeCommand(
        "workbench.action.chat.open",
        prompt
    );
}