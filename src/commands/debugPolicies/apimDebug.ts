/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Subject } from 'await-notify';
import * as request from 'request-promise-native';
import { Breakpoint, Handles, InitializedEvent, Logger, logger, LoggingDebugSession, OutputEvent, Scope, StackFrame, StoppedEvent, TerminatedEvent, Thread, ThreadEvent, Variable } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { nonNullValue } from '../../utils/nonNull';
import { DebuggerConnection, IRequestContract } from './debuggerConnection';
import { PolicySource } from './PolicySource';
import { UiRequest } from './UiRequest';
import { UiThread } from './UiThread';

// tslint:disable: indent
// tslint:disable-next-line: interface-name
export interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	gatewayAddress: string;
	managementAddress: string;
	managementAuth: string;
	stopOnEntry?: boolean;
}

// tslint:disable: no-unsafe-any
export class ApimDebugSession extends LoggingDebugSession {
	private availablePolicies: string[];
	private runtime: DebuggerConnection;
	private configurationDone: Subject = new Subject();
	private requests: UiRequest[] = [];
	private policySource: PolicySource;
	// tslint:disable-next-line: typedef
	private variablesHandles = new Handles<string>();

	public constructor() {
		super();

		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);

		this.runtime = new DebuggerConnection();

		this.runtime.on('stopOnEntry', (requestId, threadId, operationId, apiId, productId) => this.onStopOnEntry(requestId, threadId, operationId, apiId, productId));
		this.runtime.on('stopOnStep', (requestId, threadId) => this.onStop('step', requestId, threadId));
		this.runtime.on('stopOnBreakpoint', (requestId, threadId) => this.onStop('breakpoint', requestId, threadId));
		this.runtime.on('stopOnException', (requestId, threadId, operationId, apiId, productId, message) => this.onStopOnException(requestId, threadId, operationId, apiId, productId, message));
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
		// tslint:disable-next-line: strict-boolean-expressions
		response.body = response.body || {};
		response.body.supportsConfigurationDoneRequest = true;

		this.sendResponse(response);
	}

	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args);
		this.configurationDone.notify();
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments): Promise<void> {
		logger.setup(Logger.LogLevel.Verbose, false);
		this.policySource = new PolicySource(args.managementAddress, args.managementAuth);
		const masterKey = await this.getMasterSubscriptionKey(args.managementAddress, args.managementAuth);
		this.availablePolicies = await this.getAvailablePolicies(args.managementAddress, args.managementAuth);

		this.sendEvent(new InitializedEvent());
		await this.configurationDone.wait(1000);

		await this.runtime.attach(args.gatewayAddress, masterKey, !!args.stopOnEntry);
		this.sendResponse(response);
		this.updateRequests(await this.runtime.getRequests(), true);
	}

	protected terminateThreadsRequest(response: DebugProtocol.TerminateThreadsResponse, args: DebugProtocol.TerminateThreadsArguments, _request?: DebugProtocol.Request): void {
		// tslint:disable-next-line: no-non-null-assertion
		const requests = args.threadIds!.map(id => this.findThreadByUiId(id));

		// tslint:disable-next-line: strict-boolean-expressions
		if (requests.length) {
			this.runtime.terminateRequests(requests.map(r => {
				// tslint:disable-next-line: no-non-null-assertion
				return r![0].id;
			}).filter((value, index, self) => self.indexOf(value) === index));
		}

		this.sendResponse(response);
	}

	protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments): Promise<void> {
		let stack: StackFrame[] = [];
		if (this.runtime.isConnected()) {
			const nRequest = this.findThreadByUiId(args.threadId);
			if (nRequest) {
				const requestStack = await this.runtime.getStackTrace(request[0].id, request[1].id);
				stack = await request[1].getStackFrames(requestStack);

				for (const item of <DebugProtocol.StackFrame[]>stack) {
					item.line = this.convertDebuggerLineToClient(item.line);
					item.column = this.convertDebuggerColumnToClient(item.column);
					if (item.endLine !== undefined) {
						item.endLine = this.convertDebuggerLineToClient(item.endLine);
					}
					if (item.endColumn !== undefined) {
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

	protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments): Promise<void> {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			this.runtime.stepIn(nRequest[0].id, nRequest[1].id);
		}

		this.sendResponse(response);
	}

	protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments): Promise<void> {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			this.runtime.stepOut(request[0].id, request[1].id);
		}

		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments): Promise<void> {
		let variables: Variable[] = [];

		if (this.runtime.isConnected()) {
			const variableScope = this.variablesHandles.get(args.variablesReference);
			const scopeParts = variableScope.split('|');
			if (scopeParts.length >= 2) {
				const vars = await this.runtime.getVariables(scopeParts[0], +scopeParts[1], scopeParts.slice(2).join('.'));
				variables = vars.map(v => {
					const variable = new Variable(v.name, v.value, v.nestedCount ? this.variablesHandles.create(`${variableScope}|${v.name}`) : 0);
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
			variables: variables

		};
		this.sendResponse(response);
	}

	protected async pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments): Promise<void> {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			this.runtime.pause(nRequest[0].id, nRequest[1].id);
		}

		this.sendResponse(response);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments): void {
		let scopes: Scope[] = [];

		const nRequest = this.findThreadByStackFrameId(args.frameId);
		if (nRequest) {
			scopes = [new Scope("Request", this.variablesHandles.create(`${request[0].id}|${request[1].id}`), true)];
		}

		response.body = {
			scopes: scopes
		};
		this.sendResponse(response);
	}

	protected async sourceRequest(response: DebugProtocol.SourceResponse, args: DebugProtocol.SourceArguments): Promise<void> {
		const policy = this.policySource.getPolicyBySourceReference(args.sourceReference);

		// changed here
		response.body = {
			content: policy === null ? "" : policy.xml,
			mimeType: 'application/vnd.ms-azure-apim.policy.raw+xml'
		};
		this.sendResponse(response);
	}

	protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments): Promise<void> {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			this.runtime.continue(nRequest[0].id, nRequest[1].id);
		}
		this.sendResponse(response);
	}

	protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments): Promise<void> {
		const nRequest = this.findThreadByUiId(args.threadId);
		if (nRequest && this.runtime.isConnected()) {
			this.runtime.stepOver(nRequest[0].id, nRequest[1].id);
		}

		this.sendResponse(response);
	}

	protected async threadsRequest(response: DebugProtocol.ThreadsResponse): Promise<void> {
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

	protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): Promise<void> {
		let breakpoints: Breakpoint[] = [];
		const breakpointsToSet: {
			path: string,
			scopeId: string
		}[] = [];
		// tslint:disable: strict-boolean-expressions
		// tslint:disable: no-non-null-assertion
		if (args.breakpoints!.length) {
			let policy = this.policySource.getPolicyBySourceReference(nonNullValue(args.source.sourceReference));
			if (!policy && args.source.name) {
				const currentPolicy = this.policySource.getPolicy(args.source.name);
				policy = (currentPolicy !== null && currentPolicy !== undefined) ? this.policySource.getPolicy(args.source.name) : await this.policySource.fetchPolicy(args.source.name);
			}

			if (policy) {
				breakpoints = args.breakpoints!.map(b => {
					let position = {
						line: -1,
						column: -1,
						endLine: -1,
						endColumn: -1
					};

					let path: string = "";
					const breakpointLine = this.convertClientLineToDebugger(b.line);
					const breakpointColumn = b.column === undefined ? undefined : this.convertClientColumnToDebugger(b.column);

					// tslint:disable: no-non-null-assertion
					Object.keys(policy!.map).forEach(key => {
						const mapEntry = policy!.map[key];
						// some changes here
						if (mapEntry.line === breakpointLine
							&& (breakpointColumn === undefined || breakpointColumn >= mapEntry.column && breakpointColumn <= mapEntry.endColumn)
							&& (position.line === -1 || mapEntry.column < position.column)) {
							path = key;
							position = mapEntry;
						}
					});

					if (position.line === -1) {
						return new Breakpoint(false);
					}

					const policyName = path.substring(path.lastIndexOf('/') + 1);
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

		// tslint:disable-next-line: strict-boolean-expressions
		if (breakpointsToSet.length) {
			this.runtime.setBreakpoints(breakpointsToSet);
		}

		response.body = {
			breakpoints: breakpoints.length > 0 ? breakpoints : args.breakpoints!.map(() => new Breakpoint(false))
		};
		this.sendResponse(response);
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

	private async getMasterSubscriptionKey(managementAddress: string, managementAuth: string): Promise<string> {
		// tslint:disable-next-line: no-unsafe-any
		const subscription: IApimSubscription = await request.get(`${managementAddress}/subscriptions/master?api-version=2019-01-01`, {
			headers: {
				Authorization: managementAuth
			},
			strictSSL: false,
			json: true
		}).on('error', () => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode !== 200) {
				this.sendEvent(new OutputEvent(`Error fetching master subscription: ${e.statusCode} ${e.statusMessage}`, 'stderr'));
				this.sendEvent(new TerminatedEvent());
			}
		});

		return subscription.properties.primaryKey;
	}

	private async getAvailablePolicies(managementAddress: string, managementAuth: string): Promise<string[]> {
		const snippets: IPolicySnippet[] = await request.get(`${managementAddress}/policysnippets?api-version=2019-01-01`, {
			headers: {
				Authorization: managementAuth
			},
			strictSSL: false,
			json: true
		}).on('error', () => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode !== 200) {
				this.sendEvent(new OutputEvent(`Error fetching policy definitions: ${e.statusCode} ${e.statusMessage}`, 'stderr'));
				this.sendEvent(new TerminatedEvent());
			}
		});

		return snippets.map(s => s.content.substring(1, /[\s>/]/.exec(s.content)!.index));
	}

	private onStopOnEntry(requestId: string, threadId: number, operationId: string, apiId: string, productId: string): void {
		this.updateRequests([
			{
				id: requestId,
				threads: [threadId],
				operationId: operationId,
				apiId: apiId,
				productId: productId
			}
		],                  false);

		this.onStop('entry', requestId, threadId);
	}

	private onStopOnException(requestId: string, threadId: number, operationId: string, apiId: string, productId: string, message: string): void {
		this.updateRequests([
			{
				id: requestId,
				threads: [threadId],
				operationId: operationId,
				apiId: apiId,
				productId: productId
			}
		],                  false);

		this.onStop('exception', requestId, threadId, message);
	}

	private onThreadExited(requestId: string, threadId: number): void {
		const nRequest = this.requests.find(r => r.id === requestId);
		const thread = nRequest && nRequest.findThreadById(threadId);

		if (thread) {
			this.sendEvent(new ThreadEvent('exited', thread.uiId));
		}
	}

	private onStop(event: string, requestId: string, threadId: number, exceptionText?: string): void {
		const nRequest = this.requests.find(r => r.id === requestId);
		const thread = nRequest && nRequest.findThreadById(threadId);

		if (thread) {
			this.sendEvent(new StoppedEvent(event, thread.uiId, exceptionText));
		}
	}

	private updateRequests(gatewayRequests: IRequestContract[], clean: boolean): void {
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

				// tslint:disable-next-line: strict-boolean-expressions
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
