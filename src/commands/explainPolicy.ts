/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { loadPromptTemplate } from '../utils/promptUtils';

export async function explainPolicy(_context: IActionContext): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        const document = editor.document;
        const selection = editor.selection;
        const content = selection.isEmpty ? document.getText() : document.getText(selection);
        
        const prompt = loadPromptTemplate('explainPolicy.md', { content });
        await vscode.commands.executeCommand(
            "workbench.action.chat.open",
            prompt
        );
    }
}