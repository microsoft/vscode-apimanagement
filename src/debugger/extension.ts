'use strict';

import * as Net from 'net';
import * as vscode from 'vscode';
import { CancellationToken, DebugConfiguration, ProviderResult, WorkspaceFolder } from 'vscode';
import { ApimDebugSession } from './apimDebug';

// tslint:disable: no-unsafe-any
// tslint:disable: indent
// tslint:disable: export-name
// tslint:disable: strict-boolean-expressions
// tslint:disable: typedef
// tslint:disable: no-non-null-assertion
// tslint:disable: no-any
// tslint:disable: no-empty

export function activate(context: vscode.ExtensionContext) {
    const provider = new ApimPolicyConfigurationProvider();
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('apim-policy', provider));

    const factory = new ApimPolicyDebugAdapterDescriptorFactory();
    context.subscriptions.push(vscode.debug.registerDebugAdapterDescriptorFactory('apim-policy', factory));
    context.subscriptions.push(factory);
}

export function deactivate() {}

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

    public dispose() {
        if (this.server) {
            this.server.close();
        }
    }
}
