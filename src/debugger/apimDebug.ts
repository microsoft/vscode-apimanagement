/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { Logger, logger, LoggingDebugSession, InitializedEvent, TerminatedEvent, StoppedEvent, Thread, ThreadEvent, StackFrame, Variable, Scope, Handles, Breakpoint, OutputEvent } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { DebuggerConnection, RequestContract } from './debuggerConnection';
import * as request from 'request-promise-native';
import { UiRequest } from './uiRequest';
import { UiThread } from './uiThread';
import { PolicySource } from './policySource';
const { Subject } = require('await-notify');

interface LaunchRequestArguments extends DebugProtocol.LaunchRequestArguments {
	gatewayAddress: string;
	managementAddress: string;
	managementAuth: string;
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

	private onStopOnEntry(requestId: string, threadId: number, operationId: string, apiId: string, productId: string) {
		this.updateRequests([
			{
				id: requestId,
				threads: [threadId],
				operationId: operationId,
				apiId: apiId,
				productId: productId,
			}
		], false);

		this.onStop('entry', requestId, threadId);
	}

	private onStopOnException(requestId: string, threadId: number, operationId: string, apiId: string, productId: string, message: string) {
		this.updateRequests([
			{
				id: requestId,
				threads: [threadId],
				operationId: operationId,
				apiId: apiId,
				productId: productId,
			}
		], false);

		this.onStop('exception', requestId, threadId, message);
	}

	private onThreadExited(requestId: string, threadId: number) {
		const request = this.requests.find(r => r.id == requestId);
		const thread = request && request.findThreadById(threadId);

		if (thread) {
			this.sendEvent(new ThreadEvent('exited', thread.uiId));
		}
	}

	private onStop(event: string, requestId: string, threadId: number, exceptionText?: string) {
		const request = this.requests.find(r => r.id == requestId);
		const thread = request && request.findThreadById(threadId);

		if (thread) {
			this.sendEvent(new StoppedEvent(event, thread.uiId, exceptionText));
		}
	}

	protected initializeRequest(response: DebugProtocol.InitializeResponse, args: DebugProtocol.InitializeRequestArguments): void {
		response.body = response.body || {};
		response.body.supportsConfigurationDoneRequest = true;

		this.sendResponse(response);
	}

	protected configurationDoneRequest(response: DebugProtocol.ConfigurationDoneResponse, args: DebugProtocol.ConfigurationDoneArguments): void {
		super.configurationDoneRequest(response, args);
		this.configurationDone.notify();
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: LaunchRequestArguments) {
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

	private async getMasterSubscriptionKey(managementAddress: string, managementAuth: string) {
		const subscription: ApimSubscription = await request.get(`${managementAddress}/subscriptions/master?api-version=2019-01-01`, {
			headers: {
				Authorization: managementAuth
			},
			strictSSL: false,
			json: true
		}).on('error', e => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode != 200) {
				this.sendEvent(new OutputEvent(`Error fetching master subscription: ${e.statusCode} ${e.statusMessage}`, 'stderr'));
				this.sendEvent(new TerminatedEvent());
			}
		});

		return subscription.properties.primaryKey;
	}

	private async getAvailablePolicies(managementAddress: string, managementAuth: string) {
		const snippets: PolicySnippet[] = await request.get(`${managementAddress}/policysnippets?api-version=2019-01-01`, {
			headers: {
				Authorization: managementAuth
			},
			strictSSL: false,
			json: true
		}).on('error', e => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode != 200) {
				this.sendEvent(new OutputEvent(`Error fetching policy definitions: ${e.statusCode} ${e.statusMessage}`, 'stderr'));
				this.sendEvent(new TerminatedEvent());
			}
		});

		return snippets.map(s => s.content.substring(1, /[\s>/]/.exec(s.content)!.index));
	}

	protected async threadsRequest(response: DebugProtocol.ThreadsResponse) {
		if (this.runtime.isConnected()) {
			this.updateRequests(await this.runtime.getRequests(), true);
		}

		const threads: Thread[] = [];
		for (const request of this.requests) {
			for (const thread of request.threads) {
				threads.push(new Thread(thread.uiId, `${request.id} (${thread.id})`));
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
			await this.runtime.terminateRequests(requests.map(r => r[0].id).filter((value, index, self) => self.indexOf(value) === index));
		}

		this.sendResponse(response);
	}

	protected async stackTraceRequest(response: DebugProtocol.StackTraceResponse, args: DebugProtocol.StackTraceArguments) {
		let stack: StackFrame[] = [];
		if (this.runtime.isConnected()) {
			const request = this.findThreadByUiId(args.threadId);
			if (request) {
				const requestStack = await this.runtime.getStackTrace(request[0].id, request[1].id);
				stack = await request[1].getStackFrames(requestStack);

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

		response.body = {
			content: policy && policy.xml,
			mimeType: 'application/vnd.ms-azure-apim.policy.raw+xml'
		}
		this.sendResponse(response);
	}

	protected async continueRequest(response: DebugProtocol.ContinueResponse, args: DebugProtocol.ContinueArguments) {
		const request = this.findThreadByUiId(args.threadId);
		if (request && this.runtime.isConnected()) {
			await this.runtime.continue(request[0].id, request[1].id);
		}
		this.sendResponse(response);
	}

	protected async nextRequest(response: DebugProtocol.NextResponse, args: DebugProtocol.NextArguments) {
		const request = this.findThreadByUiId(args.threadId);
		if (request && this.runtime.isConnected()) {
			await this.runtime.stepOver(request[0].id, request[1].id);
		}

		this.sendResponse(response);
	}

	protected async stepInRequest(response: DebugProtocol.StepInResponse, args: DebugProtocol.StepInArguments) {
		const request = this.findThreadByUiId(args.threadId);
		if (request && this.runtime.isConnected()) {
			await this.runtime.stepIn(request[0].id, request[1].id);
		}

		this.sendResponse(response);
	}

	protected async stepOutRequest(response: DebugProtocol.StepOutResponse, args: DebugProtocol.StepOutArguments) {
		const request = this.findThreadByUiId(args.threadId);
		if (request && this.runtime.isConnected()) {
			await this.runtime.stepOut(request[0].id, request[1].id);
		}

		this.sendResponse(response);
	}

	protected async pauseRequest(response: DebugProtocol.PauseResponse, args: DebugProtocol.PauseArguments) {
		const request = this.findThreadByUiId(args.threadId);
		if (request && this.runtime.isConnected()) {
			await this.runtime.pause(request[0].id, request[1].id);
		}

		this.sendResponse(response);
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, args: DebugProtocol.ScopesArguments) {
		let scopes: Scope[];

		const request = this.findThreadByStackFrameId(args.frameId);
		if (request) {
			scopes = [new Scope("Request", this.variablesHandles.create(`${request[0].id}|${request[1].id}`), true)];
		}

		response.body = {
			scopes: scopes || []
		};
		this.sendResponse(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments) {
		let variables: Variable[];

		if (this.runtime.isConnected()) {
			const variableScope = this.variablesHandles.get(args.variablesReference);;
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
			variables: variables || [],

		};
		this.sendResponse(response);
	}

	protected async setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments) {
		let breakpoints: Breakpoint[];
		const breakpointsToSet: {
			path: string,
			scopeId: string
		}[] = [];
		if (args.breakpoints.length) {
			let policy = this.policySource.getPolicyBySourceReference(args.source.sourceReference);
			if (!policy && args.source.name) {
				policy = this.policySource.getPolicy(args.source.name) || await this.policySource.fetchPolicy(args.source.name);
			}

			if (policy) {
				breakpoints = args.breakpoints.map(b => {
					let position = {
						line: -1,
						column: -1,
						endLine: -1,
						endColumn: -1
					}

					let path: string = null;
					const breakpointLine = this.convertClientLineToDebugger(b.line);
					const breakpointColumn = b.column && this.convertClientColumnToDebugger(b.column);
					for (const key in policy.map) {
						const mapEntry = policy.map[key];
						if (mapEntry.line == breakpointLine
							&& (!breakpointColumn || breakpointColumn >= mapEntry.column && breakpointColumn <= mapEntry.endColumn)
							&& (position.line == -1 || mapEntry.column < position.column)) {
							path = key;
							position = mapEntry;
						}
					}

					if (position.line == -1) {
						return new Breakpoint(false);
					}

					const policyName = path.substring(path.lastIndexOf('/') + 1);
					if (this.availablePolicies.indexOf(policyName) == -1) {
						return new Breakpoint(false);
					}

					breakpointsToSet.push({
						path: path.substr(path.indexOf('/') + 1), //Remove 'policies/' prefix
						scopeId: policy.scopeId
					});
					const breakpoint = new Breakpoint(true, this.convertDebuggerLineToClient(position.line), this.convertDebuggerColumnToClient(position.column), policy.source);
					(<DebugProtocol.Breakpoint>breakpoint).endLine = this.convertDebuggerLineToClient(position.endLine);
					(<DebugProtocol.Breakpoint>breakpoint).endColumn = this.convertDebuggerColumnToClient(position.endColumn);
					return breakpoint;
				});
			}
		}

		if (breakpointsToSet.length) {
			await this.runtime.setBreakpoints(breakpointsToSet);
		}

		response.body = {
			breakpoints: breakpoints || args.breakpoints.map(b => new Breakpoint(false))
		}
		this.sendResponse(response);
	}

	private findThreadByUiId(id: number): [UiRequest, UiThread] {
		for (const uiRequest of this.requests) {
			const uiThread = uiRequest.findThreadByUiId(id);
			if (uiThread) {
				return [uiRequest, uiThread];
			}
		}

		return null;
	}

	private findThreadByStackFrameId(id: number): [UiRequest, UiThread] {
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
				const gatewayRequest = gatewayRequests.find(r => r.id == uiRequest.id);
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
			let uiRequest = this.requests.find(r => r.id == gatewayRequest.id);
			if (!uiRequest) {
				this.requests.push(uiRequest = new UiRequest(gatewayRequest.id, gatewayRequest.operationId, gatewayRequest.apiId, gatewayRequest.productId));
			}

			for (const gatewayThread of gatewayRequest.threads) {
				let uiThread = uiRequest.threads.find(t => t.id == gatewayThread);
				if (!uiThread) {
					uiThread = uiRequest.addNewThread(gatewayThread, this.policySource);

					this.sendEvent(new ThreadEvent('started', uiThread.uiId));
				}
			}
		}
	}
}

interface ApimSubscription {
	properties: {
		primaryKey: string;
		secondaryKey: string;
	}
}

interface PolicySnippet {
	content: string;
}