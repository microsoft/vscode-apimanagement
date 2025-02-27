/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as path from 'path';
import { ext } from '../extensionVariables';

export interface PromptPlaceholders {
    [key: string]: string;
}

export function loadPromptTemplate(templateName: string, placeholders: PromptPlaceholders): string {
    const promptPath = path.join(ext.context.extensionPath, 'resources', 'prompts', templateName);
    let prompt = fs.readFileSync(promptPath, 'utf8');
    
    // Replace all placeholders in the format ${key} with their values
    for (const [key, value] of Object.entries(placeholders)) {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        prompt = prompt.replace(regex, value);
    }
    
    return prompt;
}