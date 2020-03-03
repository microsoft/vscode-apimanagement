/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as Net from 'net';
import * as vscode from 'vscode';
import { CancellationToken, DebugConfiguration, ProviderResult, WorkspaceFolder } from 'vscode';
import { ApimDebugSession } from './apimDebug';

export function activate(context: vscode.ExtensionContext): void {
    const provider = new ApimPolicyConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('apim-policy', provider));

    const factory = new ApimPolicyDebugAdapterDescriptorFactory();
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('apim-policy', factory));
    context.subscriptions.push(factory);
}

// tslint:disable-next-line: no-empty
export function deactivate(): void {
}

class ApimPolicyConfigurationProvider implements vscode.DebugConfigurationProvider {
    public resolveDebugConfiguration(_folder: WorkspaceFolder | undefined, config: DebugConfiguration, _token?: CancellationToken): ProviderResult<DebugConfiguration> {
        if (!config.type && !config.request && !config.name) {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'apim-policy') {
                config.type = 'apim-policy';
                config.name = 'Debug open APIM policy';
                config.request = 'launch';
                config.stopOnEntry = true;
            }
        }

        config.gatewayAddress = 'wss://proxy.apim.net/debug-0123456789abcdef';
        config.managementAddress = 'https://management.apim.net/subscriptions/a200340d-6b82-494d-9dbf-687ba6e33f9e/resourceGroups/Api-Default-West-US/providers/microsoft.apimanagement/service/devportal-lrp';
        config.managementAuth = 'SharedAccessSignature integration&202004012324&qpC28gFSx2WZG/j+NVVoPFJyvfu0e1ALECH2cydrMVT7EAFsgag1sW3tSNQ9A5pTa/r61wCI8EDAKMvKHuUJ9A==';
        return config;
    }
}

class ApimPolicyDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {

    private server?: Net.Server;

    public createDebugAdapterDescriptor(_session: vscode.DebugSession, _executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        if (!this.server) {
            // start listening on a random port
            this.server = Net.createServer(socket => {
                const session = new ApimDebugSession();
                session.setRunAsServer(true);
                session.start(<NodeJS.ReadableStream>socket, socket);
            }).listen(0);
        }

        // make VS Code connect to debug server
        return new vscode.DebugAdapterServer(this.server.address().port);
    }

    public dispose(): void {
        if (this.server) {
            this.server.close();
        }
    }
}
