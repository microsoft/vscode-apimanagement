/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { TokenCredentialsBase } from "@azure/ms-rest-nodeauth";
import * as request from 'request-promise-native';
import * as vscode from 'vscode';
import { Breakpoint, Handles, InitializedEvent, Logger, logger, LoggingDebugSession, OutputEvent, Scope, StackFrame, StoppedEvent, TerminatedEvent, Thread, ThreadEvent, Variable } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { createTemporaryFile } from "../utils/fsUtil";
import { getBearerToken } from '../utils/requestUtil';
import { writeToEditor } from '../utils/vscodeUtils';
import { DebuggerConnection, RequestContract } from './debuggerConnection';
import { PolicySource } from './policySource';
import { UiRequest } from './uiRequest';
import { UiThread } from './uiThread';

// tslint:disable: no-unsafe-any
// tslint:disable: indent
// tslint:disable: export-name
// tslint:disable: strict-boolean-expressions
// tslint:disable: typedef
// tslint:disable: no-non-null-assertion
// tslint:disable: no-for-in
// tslint:disable: forin
// tslint:disable: no-var-requires
const { Subject } = require('await-notify');

interface ILaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	gatewayAddress: string;
	managementAddress: string;
	managementAuth: string;
	subscriptionId: string;
	operationData: string;
	fileName: string;
	stopOnEntry?: boolean;
}

export class ApimDebugSession extends LoggingDebugSession {
	private availablePolicies: string[];
	private runtime: DebuggerConnection;
	private configurationDone = new Subject();
	private requests: UiRequest[] = [];
	private policySource: PolicySource;
	private variablesHandles = new Handles<string>();

	public constructor() {
		super();

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

		this.runtime = new DebuggerConnection();

		this.runtime.on('stopOnEntry', (requestId, threadId, operationId, apiId, productId) => this.onStop('entry', requestId, threadId, operationId, apiId, productId));
		this.runtime.on('stopOnStep', (requestId, threadId, operationId, apiId, productId) => this.onStop('step', requestId, threadId, operationId, apiId, productId));
		this.runtime.on('stopOnBreakpoint', (requestId, threadId, operationId, apiId, productId) => this.onStop('breakpoint', requestId, threadId, operationId, apiId, productId));
		this.runtime.on('stopOnException', (requestId, threadId, operationId, apiId, productId, message) => this.onStop('exception', requestId, threadId, operationId, apiId, productId, message));
		this.runtime.on('threadExited', (requestId, threadId) => this.onThreadExited(requestId, threadId));
		this.runtime.on('end', message => {
			this.requests = [];
			if (message) {
				this.sendEvent(new OutputEvent(message, 'stderr'));
			}
			this.sendEvent(new TerminatedEvent());
		});
	}

	protected initializeRequest(response: DebugProtocol.InitializeResponse, _args: DebugProtocol.InitializeRequestArguments): void {
		response.body = response.body || {};
		response.body.supportsConfigurationDoneRequest = true;

		response.body.supportsRestartRequest = false;
		response.body.supportsRestartFrame = false;
		this.sendResponse(response);
	}

	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args);
		this.configurationDone.notify();
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: ILaunchRequestArguments): Promise<void> {
		logger.setup(Logger.LogLevel.Verbose, false);
		let masterKey;
		if (args.managementAuth) {
			this.policySource = new PolicySource(args.managementAddress, undefined, args.managementAuth);
			masterKey = await this.getMasterSubscriptionKey(args.managementAddress, undefined, args.managementAuth);
			this.availablePolicies = await this.getAvailablePolicies(args.managementAddress, undefined, args.managementAuth);
		} else {
			const credential = await this.getAccountCredentials(args.subscriptionId);
			this.policySource = new PolicySource(args.managementAddress, credential);
			masterKey = await this.getMasterSubscriptionKey(args.managementAddress, credential);
			this.availablePolicies = await this.getAvailablePolicies(args.managementAddress, credential);
		}

		await this.runtime.attach(args.gatewayAddress, masterKey, !!args.stopOnEntry);
		this.sendEvent(new InitializedEvent());
		await this.configurationDone.wait(1000);
		this.sendResponse(response);
		this.updateRequests(await this.runtime.getRequests(), true);
		await this.createTestOperationFile(args.operationData, args.fileName);
	}

	protected async threadsRequest(response: DebugProtocol.ThreadsResponse) {
		if (this.runtime.isConnected()) {
			this.updateRequests(await this.runtime.getRequests(), true);
		}

		const threads: Thread[] = [];
		for (const nRequest of this.requests) {
			for (const thread of nRequest.threads) {
				threads.push(new Thread(thread.uiId, `${nRequest.id} (${thread.id})`));
			}
		}

		response.body = {
			threads: threads
		};

		this.sendResponse(response);
	}

	protected async terminateThreadsRequest(response: DebugProtocol.TerminateThreadsResponse, args: DebugProtocol.TerminateThreadsArguments, _request?: DebugProtocol.Request) {
		const requests = args.threadIds!.map(id => this.findThreadByUiId(id));

		if (requests.length) {
			await this.runtime.terminateRequests(requests.map(r => r![0].id).filter((value, index, self) => self.indexOf(value) === index));
		}

		this.sendResponse(response);
	}

	protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments) {
		let stack: StackFrame[] = [];
		if (this.runtime.isConnected()) {
			const nRequest = this.findThreadByUiId(args.threadId);
			if (nRequest) {
				const requestStack = await this.runtime.getStackTrace(nRequest[0].id, nRequest[1].id);
				stack = await nRequest[1].getStackFrames(requestStack);

				for (const item of <DebugProtocol.StackFrame[]>stack) {
					if (item.line) {
						item.line = this.convertDebuggerLineToClient(item.line);
					}
					if (item.column) {
						item.column = this.convertDebuggerColumnToClient(item.column);
					}
					if (item.endLine) {
						item.endLine = this.convertDebuggerLineToClient(item.endLine);
					}
					if (item.endColumn) {
						item.endColumn = this.convertDebuggerColumnToClient(item.endColumn) + 1;
					}
				}
			}
		}

		response.body = {
			stackFrames: stack,
			totalFrames: stack.length
		};
		this.sendResponse(response);
	}

	protected async sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments) {
		const policy = this.policySource.getPolicyBySourceReference(args.sourceReference);

		if (policy !== null && policy.xml !== null) {
			response.body = {
				content: policy && policy.xml,
				mimeType: 'application/vnd.ms-azure-apim.policy.raw+xml'
			};
			this.sendResponse(response);
		}
	}

	protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments) {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			await this.runtime.continue(nRequest[0].id, nRequest[1].id);
		}

		response.body = {
			allThreadsContinued: false
		};
		this.sendResponse(response);
	}

	protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments) {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			await this.runtime.stepOver(nRequest[0].id, nRequest[1].id);
		}

		this.sendResponse(response);
	}

	protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments) {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			await this.runtime.stepIn(nRequest[0].id, nRequest[1].id);
		}

		this.sendResponse(response);
	}

	protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments) {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			await this.runtime.stepOut(nRequest[0].id, nRequest[1].id);
		}

		this.sendResponse(response);
	}

	protected async pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments) {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			await this.runtime.pause(nRequest[0].id, nRequest[1].id);
		}

		this.sendResponse(response);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments) {
		let scopes: Scope[] = [];

		const nRequest = this.findThreadByStackFrameId(args.frameId);
		if (nRequest) {
			scopes = [new Scope("Request", this.variablesHandles.create(`${nRequest[0].id}|${nRequest[1].id}`), true)];
		}

		response.body = {
			scopes: scopes || []
		};
		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments) {
		let variables: Variable[] = [];

		if (this.runtime.isConnected()) {
			const variableScope = this.variablesHandles.get(args.variablesReference);
			const scopeParts = variableScope.split('|');
			if (scopeParts.length >= 2) {
				const vars = await this.runtime.getVariables(scopeParts[0], +scopeParts[1], scopeParts.slice(2).join('.'));
				variables = vars.map(v => {
					const variable = new Variable(v.name, v.value || "", v.nestedCount ? this.variablesHandles.create(`${variableScope}|${v.name}`) : 0);
					(<DebugProtocol.Variable>variable).type = v.type;
					(<DebugProtocol.Variable>variable).namedVariables = v.nestedCount;
					(<DebugProtocol.Variable>variable).presentationHint = {
						kind: 'property',
						visibility: 'public'
					};
					return variable;
				});
			}
		}

		response.body = {
			variables: variables || []

		};
		this.sendResponse(response);
	}

	protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
		const breakpoints = await this.setBreakpoints(args);
		const nBreakpoints: Breakpoint[] = (breakpoints.length !== 0) ? breakpoints : (args.breakpoints) ? args.breakpoints.map(_b => new Breakpoint(false)) : [];
		response.body = {
			breakpoints: nBreakpoints
		};
		this.sendResponse(response);
	}

	private async createTestOperationFile(operationData: string, fileName: string) {
		const localFilePath: string = await createTemporaryFile(fileName);
		const document: vscode.TextDocument = await vscode.workspace.openTextDocument(localFilePath);
		const textEditor: vscode.TextEditor = await vscode.window.showTextDocument(document);
		await writeToEditor(textEditor, operationData);
		await textEditor.document.save();
	}

	private async setBreakpoints(args: DebugProtocol.SetBreakpointsArguments): Promise<Breakpoint[]> {
		let breakpoints: Breakpoint[] = [];
		const breakpointsToSet: {
			path: string,
			scopeId: string
		}[] = [];
		let policy = this.policySource.getPolicyBySourceReference(args.source.sourceReference);
		if (!policy && args.source.name) {
			policy = this.policySource.getPolicy(args.source.name) || await this.policySource.fetchPolicy(args.source.name);
		}
		if (args.breakpoints && args.breakpoints.length) {
			// set breakpoints if has policy otherwise check if it's initialization
			if (policy && policy !== null) {
				breakpoints = args.breakpoints.map(b => {
					let position = {
						line: -1,
						column: -1,
						endLine: -1,
						endColumn: -1
					};

					let path: string | null = null;
					const breakpointLine = this.convertClientLineToDebugger(b.line);
					const breakpointColumn = b.column && this.convertClientColumnToDebugger(b.column);
					for (const key in policy!.map) {
						const mapEntry = policy!.map[key];
						if (mapEntry.line === breakpointLine
							&& (!breakpointColumn || breakpointColumn >= mapEntry.column && breakpointColumn <= mapEntry.endColumn)
							&& (position.line === -1 || mapEntry.column < position.column)) {
							path = key;
							position = mapEntry;
						}
					}
					if (position.line === -1) {
						return new Breakpoint(false);
					}

					if (path === null) {
						throw new Error("Path is null");
					}
					let policyName = path.substring(path.lastIndexOf('/') + 1);
					if (policyName.indexOf('[') !== -1) {
						policyName = policyName.substring(0, policyName.lastIndexOf('['));
					}

					if (this.availablePolicies.indexOf(policyName) === -1) {
						return new Breakpoint(false);
					}

					breakpointsToSet.push({
						path: path.substr(path.indexOf('/') + 1), //Remove 'policies/' prefix
						scopeId: policy!.scopeId
					});
					const breakpoint = new Breakpoint(true, this.convertDebuggerLineToClient(position.line), this.convertDebuggerColumnToClient(position.column), policy!.source);
					(<DebugProtocol.Breakpoint>breakpoint).endLine = this.convertDebuggerLineToClient(position.endLine);
					(<DebugProtocol.Breakpoint>breakpoint).endColumn = this.convertDebuggerColumnToClient(position.endColumn);
					return breakpoint;
				});
			}
		}

		await this.runtime.setBreakpoints(breakpointsToSet, policy!.scopeId);
		return breakpoints;
	}

	private onThreadExited(requestId: string, threadId: number) {
		const nRequest = this.requests.find(r => r.id === requestId);
		const thread = nRequest && nRequest.findThreadById(threadId);

		if (thread) {
			this.sendEvent(new ThreadEvent('exited', thread.uiId));
		}
	}

	private onStop(event: string, requestId: string, threadId: number, operationId: string, apiId: string, productId: string, exceptionText?: string) {
		this.updateRequests([
			{
				id: requestId,
				threads: [threadId],
				operationId: operationId,
				apiId: apiId,
				productId: productId
			}
		],                  false);
		const nRequest = this.requests.find(r => r.id === requestId);
		const thread = nRequest && nRequest.findThreadById(threadId);

		if (thread) {
			this.sendEvent(new StoppedEvent(event, thread.uiId, exceptionText));
		}
	}

	private async getAccountCredentials(subscriptionId: string): Promise<TokenCredentialsBase> {
		const azureAccountExtension = vscode.extensions.getExtension('ms-vscode.azure-account');
		const azureAccount = azureAccountExtension!.exports;
		await azureAccount.waitForFilters();
		if (azureAccount.status !== 'LoggedIn') {
			throw new Error("ERROR!");
		}
		const creds = azureAccount.filters.filter(filter => filter.subscription.subscriptionId === subscriptionId).map(filter => filter.session.credentials);
		return creds[0];
	}

	private async getMasterSubscriptionKey(managementAddress: string, credential?: TokenCredentialsBase, managementAuth?: string) {
		const resourceUrl = `${managementAddress}/subscriptions/master?api-version=2019-01-01`;
		const authToken = managementAuth ? managementAuth : await getBearerToken(resourceUrl, "GET", credential!);
		const subscription: IApimSubscription = await request.get(resourceUrl, {
			headers: {
				Authorization: authToken
			},
			strictSSL: false,
			json: true
		}).on('error', _e => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode !== 200) {
				this.sendEvent(new OutputEvent(`Error fetching master subscription: ${e.statusCode} ${e.statusMessage}`, 'stderr'));
				this.sendEvent(new TerminatedEvent());
			}
		});

		return subscription.properties.primaryKey;
	}

	private async getAvailablePolicies(managementAddress: string, credential?: TokenCredentialsBase, managementAuth?: string) {
		const resourceUrl = `${managementAddress}/policysnippets?api-version=2019-01-01`;
		const authToken = managementAuth ? managementAuth : await getBearerToken(resourceUrl, "GET", credential!);
		const snippets: IPolicySnippet[] = await request.get(resourceUrl, {
			headers: {
				Authorization: authToken
			},
			strictSSL: false,
			json: true
		}).on('error', _e => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode !== 200) {
				this.sendEvent(new OutputEvent(`Error fetching policy definitions: ${e.statusCode} ${e.statusMessage}`, 'stderr'));
				this.sendEvent(new TerminatedEvent());
			}
		});

		return snippets.map(s => s.content.substring(1, /[\s>/]/.exec(s.content)!.index));
	}

	private findThreadByUiId(id: number): [UiRequest, UiThread] | null {
		for (const uiRequest of this.requests) {
			const uiThread = uiRequest.findThreadByUiId(id);
			if (uiThread) {
				return [uiRequest, uiThread];
			}
		}

		return null;
	}

	private findThreadByStackFrameId(id: number): [UiRequest, UiThread] | null {
		for (const uiRequest of this.requests) {
			const uiThread = uiRequest.findThreadByStackFrameId(id);
			if (uiThread) {
				return [uiRequest, uiThread];
			}
		}

		return null;
	}

	private updateRequests(gatewayRequests: RequestContract[], clean: boolean) {
		if (clean) {
			let requestIndex = 0;
			while (requestIndex < this.requests.length) {
				const uiRequest = this.requests[requestIndex];
				const gatewayRequest = gatewayRequests.find(r => r.id === uiRequest.id);
				if (!gatewayRequest) {
					for (const thread of uiRequest.threads) {
						this.sendEvent(new ThreadEvent('exited', thread.uiId));
					}

					this.requests.splice(requestIndex, 1);
					continue;
				}

				let threadIndex = 0;
				while (threadIndex < uiRequest.threads.length) {
					const uiThread = uiRequest.threads[threadIndex];
					if (gatewayRequest.threads.indexOf(uiThread.id) < 0) {
						this.sendEvent(new ThreadEvent('exited', uiThread.uiId));
						uiRequest.threads.splice(threadIndex, 1);
						continue;
					}

					threadIndex++;
				}

				if (!uiRequest.threads.length) {
					this.requests.splice(requestIndex, 1);
					continue;
				}

				requestIndex++;
			}
		}

		for (const gatewayRequest of gatewayRequests) {
			let uiRequest = this.requests.find(r => r.id === gatewayRequest.id);
			if (!uiRequest) {
				this.requests.push(uiRequest = new UiRequest(gatewayRequest.id, gatewayRequest.operationId, gatewayRequest.apiId, gatewayRequest.productId));
			}

			for (const gatewayThread of gatewayRequest.threads) {
				let uiThread = uiRequest.threads.find(t => t.id === gatewayThread);
				if (!uiThread) {
					uiThread = uiRequest.addNewThread(gatewayThread, this.policySource);

					this.sendEvent(new ThreadEvent('started', uiThread.uiId));
				}
			}
		}
	}
}

interface IApimSubscription {
	properties: {
		primaryKey: string;
		secondaryKey: string;
	};
}

interface IPolicySnippet {
	content: string;
}
