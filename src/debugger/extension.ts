'use strict';

import * as Net from 'net';
import * as vscode from 'vscode';
import { CancellationToken, DebugConfiguration, ProviderResult, WorkspaceFolder } from 'vscode';
import { ApimDebugSession } from './apimDebug';
import * as Crypto from 'crypto';

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

    context.subscriptions.push(vscode.debug.registerDebugAdapterTrackerFactory('apim-policy', new ApimPolicyDebugSessionKeyAppenderFactory()));
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

class ApimPolicyDebugSessionKeyAppenderFactory implements vscode.DebugAdapterTrackerFactory {
    createDebugAdapterTracker(session: vscode.DebugSession): vscode.ProviderResult<vscode.DebugAdapterTracker> {
        return new ApimPolicyDebugSessionKeyAppender(session);
    }
}

class ApimPolicyDebugSessionKeyAppender implements vscode.DebugAdapterTracker {
    private sessionKey: string;

    constructor(_session: vscode.DebugSession) {
        this.sessionKey = _session.configuration.key;
    }

    onWillReceiveMessage(message: any) {
        if (!message.arguments) {
            message.arguments = {};
        }

        //Append the session key to every message we send
        message.arguments._sessionKey = this.sessionKey;
    }
}

class ApimPolicyDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
    private server?: Net.Server;
    private serverKey: string;

    public createDebugAdapterDescriptor(_session: vscode.DebugSession, _executable: vscode.DebugAdapterExecutable | undefined): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
        if (!this.server) {
            // generate a random key for further the debug sessions
            this.serverKey = Crypto.randomBytes(16).toString('hex');

            // start listening on a random port
            this.server = Net.createServer(socket => {
                const session = new ApimDebugSession(this.serverKey);
                session.setRunAsServer(true);
                session.start(<NodeJS.ReadableStream>socket, socket);
            }).listen(0);
        }

        _session.configuration.key = this.serverKey;

        // make VS Code connect to debug server
        return new vscode.DebugAdapterServer(this.server.address().port);
    }

    public dispose() {
        if (this.server) {
            this.server.close();
        }
    }
}
