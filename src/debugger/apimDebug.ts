/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as request from 'request-promise-native';
import * as vscode from 'vscode';
import { Breakpoint, Handles, InitializedEvent, Logger, logger, LoggingDebugSession, OutputEvent, Scope, StackFrame, StoppedEvent, TerminatedEvent, Thread, ThreadEvent, Variable } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { IArmResource, IMasterSubscriptionsSecrets, IPaged } from "../azure/apim/contracts";
import * as Constants from "../constants";
import { localize } from "../localize";
import { createTemporaryFile } from "../utils/fsUtil";
import { getBearerToken } from '../utils/requestUtil';
import { writeToEditor } from '../utils/vscodeUtils';
import { DebuggerConnection, RequestContract } from './debuggerConnection';
import { PolicySource } from './policySource';
import { UiRequest } from './uiRequest';
import { UiThread } from './uiThread';
import { AzureAuth } from "../azure/azureLogin/azureAuth";
import { GeneralUtils } from "../utils/generalUtils";
import { TokenCredential } from "@azure/core-auth";
import { UiStrings } from '../uiStrings';
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

	public constructor(private sessionKey: string) {
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

	public handleMessage(request: DebugProtocol.Request): void {
		// If request came from VSCode there must be session key present, if not - ignore the message
		if (this.sessionKey !== request.arguments?._sessionKey) {
			return;
		}

		delete request.arguments._sessionKey;
		super.handleMessage(request);
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: ILaunchRequestArguments): Promise<void> {
		logger.setup(Logger.LogLevel.Verbose, false);
		let masterKey;
		if (args.managementAuth) {
			this.policySource = new PolicySource(args.managementAddress, undefined, args.managementAuth);
			await this.enableMasterSubscriptionTracing(args.managementAddress, undefined, args.managementAuth);
			masterKey = await this.getMasterSubscriptionKey(args.managementAddress, undefined, args.managementAuth);
			this.availablePolicies = await this.getAvailablePolicies(args.managementAddress, undefined, args.managementAuth);
		} else {
			const credential = await this.getAccountCredentials();
			this.policySource = new PolicySource(args.managementAddress, credential);
			await this.enableMasterSubscriptionTracing(args.managementAddress, credential);
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

	protected async getMasterSubscriptionTracing(managementAddress: string, authToken: string): Promise<any> {
		const resourceUrl = `${managementAddress}/subscriptions/master?api-version=${Constants.apimApiVersion}`;
		return await request.get(resourceUrl, {
			headers: {
				Authorization: authToken
			},
			json: true,
			strictSSL: false
		}).on('error', _e => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode !== 200) {
				this.sendEvent(new OutputEvent(localize("", `Error checking subscription tracing status: ${e.statusCode} ${e.statusMessage}`, 'stderr')));
				this.sendEvent(new TerminatedEvent());
			}
		});
	}

	protected async updateMasterSubscriptionTracing(managementAddress: string, authToken: string): Promise<void> {
		const resourceUrl = `${managementAddress}/subscriptions/master?api-version=${Constants.apimApiVersion}`;
		await request.patch(resourceUrl, {
			headers: {
				Authorization: authToken
			},
			body: {
				properties: {
					allowTracing: true
				}
			},
			json: true,
			strictSSL: false
		}).on('error', _e => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode !== 200 && e.statusCode !== 202) {
				this.sendEvent(new OutputEvent(localize("", `Error enabling subscription tracing: ${e.statusCode} ${e.statusMessage}`, 'stderr')));
				this.sendEvent(new TerminatedEvent());
			}
		});
	}

	protected async showTracingEnablePrompt(managementAddress: string): Promise<boolean> {
		const serviceNameMatch = managementAddress.match(/\/service\/([^\/]+)/i);
		const serviceName = serviceNameMatch ? serviceNameMatch[1] : 'API Management service';
		
		const confirmation = await vscode.window.showWarningMessage(
			UiStrings.EnableTracingConfirmTitle.replace("{0}", serviceName),
			{ modal: true, detail: UiStrings.EnableTracingConfirmDetail },
			{ title: UiStrings.EnableTracingConfirmButton, isCloseAffordance: false },
			{ title: UiStrings.CancelDebugButton, isCloseAffordance: true }
		);

		if (!confirmation || confirmation.title === UiStrings.CancelDebugButton) {
			this.sendEvent(new TerminatedEvent());
			return false;
		}
		return true;
	}

	protected async enableMasterSubscriptionTracing(managementAddress: string, credential?: TokenCredential, managementAuth?: string): Promise<void> {
		const authToken = managementAuth ? managementAuth : await getBearerToken(`${managementAddress}/subscriptions/master`, "GET", credential!);
		
		// Check current tracing status
		const masterSubscription = await this.getMasterSubscriptionTracing(managementAddress, authToken);

		// If tracing is already enabled, no need to prompt
		if (masterSubscription.properties?.allowTracing === true) {
			return;
		}

		// Prompt user to enable tracing
		if (!await this.showTracingEnablePrompt(managementAddress)) {
			return;
		}

		// Enable tracing
		await this.updateMasterSubscriptionTracing(managementAddress, authToken);
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

	private async getAccountCredentials(): Promise<TokenCredential> {
		const session = await AzureAuth.getReadySessionProvider();
		if (GeneralUtils.failed(session)) {
			throw new Error("Failed to access the Azure Account Session.");
		}
		return await AzureAuth.getCredential(session.result);
	}

	private async getMasterSubscriptionKey(managementAddress: string, credential?: TokenCredential, managementAuth?: string) {
		const resourceUrl = `${managementAddress}/subscriptions/master/listSecrets?api-version=${Constants.apimApiVersion}`;
		const authToken = managementAuth ? managementAuth : await getBearerToken(resourceUrl, "GET", credential!);
		const subscription: IMasterSubscriptionsSecrets = await request.post(resourceUrl, {
			headers: {
				Authorization: authToken
			},
			strictSSL: false,
			json: true
		}).on('error', _e => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode !== 200) {
				this.sendEvent(new OutputEvent(localize("", `Error fetching master subscription: ${e.statusCode} ${e.statusMessage}`, 'stderr')));
				this.sendEvent(new TerminatedEvent());
			}
		});

		return subscription.primaryKey;
	}

	private async getAvailablePolicies(managementAddress: string, credential?: TokenCredential, managementAuth?: string) {
		const resourceUrl = `${managementAddress}/policyDescriptions?api-version=${Constants.apimApiVersion}`;
		const authToken = managementAuth ? managementAuth : await getBearerToken(resourceUrl, "GET", credential!);
		const policyDescriptions: IPaged<IArmResource> = await request.get(resourceUrl, {
			headers: {
				Authorization: authToken
			},
			strictSSL: false,
			json: true
		}).on('error', _e => {
			this.sendEvent(new TerminatedEvent());
		}).on('response', e => {
			if (e.statusCode !== 200) {
				this.sendEvent(new OutputEvent(localize("", `Error fetching policy definitions: ${e.statusCode} ${e.statusMessage}`, 'stderr')));
				this.sendEvent(new TerminatedEvent());
			}
		});

		return policyDescriptions.value.map(p => p.name);
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
