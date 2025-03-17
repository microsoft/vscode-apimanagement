/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export async function showReleaseNotes(context: vscode.ExtensionContext): Promise<void> {
    const packageJson = JSON.parse(fs.readFileSync(path.join(context.extensionPath, 'package.json'), 'utf8'));
    const currentVersion = packageJson.version;
    const lastVersion = context.globalState.get<string>('lastShownVersion');

    // Only show if version has changed and not shown before
    if (lastVersion !== currentVersion) {
        const changelogPath = path.join(context.extensionPath, 'CHANGELOG.md');

        // Show the changelog in a new markdown preview
        const uri = vscode.Uri.file(changelogPath);
        await vscode.commands.executeCommand('markdown.showPreview', uri, { locked: true });
        
        // Store the current version so we don't show it again
        await context.globalState.update('lastShownVersion', currentVersion);
    }
}
