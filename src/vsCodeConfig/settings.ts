/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurationTarget, Uri, workspace, WorkspaceConfiguration } from "vscode";
import { extensionPrefix } from "../constants";

export function getGlobalSetting<T>(key: string, prefix: string = extensionPrefix): T | undefined {
    const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix);
    const result: { globalValue?: T } | undefined = projectConfiguration.inspect<T>(key);
    return result && result.globalValue;
}

export async function updateGlobalSetting<T = string>(section: string, value: T, prefix: string = extensionPrefix): Promise<void> {
    const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix);
    await projectConfiguration.update(section, value, ConfigurationTarget.Global);
}

export function getWorkspaceSetting<T>(key: string, fsPath?: string, prefix: string = extensionPrefix): T | undefined {
    const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix, fsPath ? Uri.file(fsPath) : undefined);
    return projectConfiguration.get<T>(key);
}

export async function updateWorkspaceSetting<T = string>(section: string, value: T, fsPath: string, prefix: string = extensionPrefix): Promise<void> {
    const projectConfiguration: WorkspaceConfiguration = workspace.getConfiguration(prefix, Uri.file(fsPath));
    await projectConfiguration.update(section, value);
}
