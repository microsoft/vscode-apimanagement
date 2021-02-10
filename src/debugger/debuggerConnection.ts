/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { EventEmitter } from 'events';
import WebSocket from "ws";
import { localize } from '../localize';

// tslint:disable: no-unsafe-any
// tslint:disable: indent
// tslint:disable: export-name
// tslint:disable: strict-boolean-expressions
// tslint:disable: typedef
// tslint:disable: no-non-null-assertion
// tslint:disable: no-any
// tslint:disable: no-reserved-keywords
// tslint:disable: interface-name

export interface MockBreakpoint {
	id: number;
	line: number;
	verified: boolean;
}

export class DebuggerConnection extends EventEmitter {
	private connection: WebSocket | null;
	private responseAwaiters: {
		[key: string]: ((value: any) => void)[]
	} = {};

	constructor() {
		super();

		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	}

	public isConnected() {
		return this.connection != null;
	}

	public async attach(address: string, key: string, stopOnEntry: boolean) {
		let connection: WebSocket;
		return new Promise((resolve, reject) => {
			connection = new WebSocket(`${address}?key=${key}`)
				.on('error', e => {
					if (this.connection == null || this.connection === connection) {
						this.connection = null;
						this.sendEvent('end', localize("", `Can't connect to gateway: ${e.message}.`));
					}
					reject();
				})
				.on('open', () => {
					this.connection = connection;
					this.sendCommand('attach', {
						break: stopOnEntry
					});
					resolve();
				})
				.on('message', e => {
					this.parseResponse(e.toString());
				});
		});
	}

	public async getRequests() {
		return this.waitForResponse<RequestContract[]>(() => this.sendCommand('getRequests'), 'requests');
	}

	public async getStackTrace(requestId: string, threadId: number) {
		return this.waitForResponse<StackFrameContract[]>(() => this.sendCommand('getStackTrace', {
			requestId: requestId,
			threadId: threadId
		}),                                               'stackTrace');
	}

	public async getVariables(requestId: string, threadId: number, path?: string) {
		return this.waitForResponse<VariableContract[]>(() => this.sendCommand('getVariables', {
			requestId: requestId,
			threadId: threadId,
			path: path
		}),                                             'variables');
	}

	public async setBreakpoints(breakpoints: { path: string, scopeId: string}[], scopeId: string) {
		this.sendCommand('setBreakpoints', {
			scopeId: scopeId,
			breakpoints: breakpoints
		});
	}

	public async stepOver(requestId: string, threadId: number) {
		this.sendCommand('stepOver', {
			requestId: requestId,
			threadId: threadId
		});
	}

	public async stepIn(requestId: string, threadId: number) {
		this.sendCommand('stepIn', {
			requestId: requestId,
			threadId: threadId
		});
	}

	public async stepOut(requestId: string, threadId: number) {
		this.sendCommand('stepOut', {
			requestId: requestId,
			threadId: threadId
		});
	}

	public async continue(requestId: string, threadId: number) {
		this.sendCommand('continue', {
			requestId: requestId,
			threadId: threadId
		});
	}

	public async pause(requestId: string, threadId: number) {
		this.sendCommand('pause', {
			requestId: requestId,
			threadId: threadId
		});
	}

	public async terminateRequests(requests: string[]) {
		this.sendCommand('terminateRequests', {
			requests: requests
		});
	}

	private sendCommand(name: string, args?: any) {
		if (this.connection == null) {
			return;
		}

		this.connection.send(JSON.stringify({
			name: name,
			arguments: args
		}));
	}

	private parseResponse(data: string) {
		try {
			// tslint:disable-next-line: no-banned-terms
			const event: { name: string, arguments: any } = JSON.parse(data.trim());
			// tslint:disable-next-line: switch-default
			switch (event.name) {
				case 'stopOnEntry':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId, event.arguments.operationId, event.arguments.apiId, event.arguments.productId);
					break;
				case 'stopOnStep':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId, event.arguments.operationId, event.arguments.apiId, event.arguments.productId);
					break;
				case 'stopOnException':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId, event.arguments.operationId, event.arguments.apiId, event.arguments.productId, event.arguments.message);
					break;
				case 'stopOnBreakpoint':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId, event.arguments.operationId, event.arguments.apiId, event.arguments.productId);
					break;
				case 'threadExited':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId, event.arguments.operationId, event.arguments.apiId, event.arguments.productId);
					break;
			}

			const awaiters = this.responseAwaiters[event.name];
			if (awaiters) {
				for (const awaiter of awaiters) {
					awaiter(event.arguments);
				}

				delete this.responseAwaiters[event.name];
			}
		} catch {
			return;
		}
	}

	private async waitForResponse<T>(sendCommand: () => void, name: string) {
		return new Promise<T>(resolve => {
			(this.responseAwaiters[name] || (this.responseAwaiters[name] = [])).push(resolve);
			sendCommand();
		});
	}

	private sendEvent(event: string, ...args: any[]) {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}
}

export interface RequestContract {
	id: string;
	threads: number[];
	operationId: string;
	apiId: string;
	productId: string;
}

export interface StackFrameContract {
	scopeId: string;
	index: number;
	name: string;
	section: string;
}

export enum StackFrameScopeContract {
	operation = '/operations',
	api = '/apis',
	product = '/products',
	tenant = '/tenant'
}

export interface VariableContract {
	name: string;
	type: string;
	value: any;
	nestedCount: any;
}
