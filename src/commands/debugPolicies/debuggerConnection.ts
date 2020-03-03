/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { EventEmitter } from 'events';
import * as WebSocket from "ws";

// tslint:disable: indent
export interface IMockBreakpoint {
	id: number;
	line: number;
	verified: boolean;
}

export class DebuggerConnection extends EventEmitter {
	private connection: WebSocket | null;
	private responseAwaiters: {
		// tslint:disable-next-line: no-any
		[key: string]: ((value: any) => void)[]
	} = {};

	constructor() {
		super();

		process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
	}

	public isConnected(): boolean {
		return this.connection != null;
	}

	public async attach(address: string, key: string, stopOnEntry: boolean): Promise<void> {
		let connection: WebSocket;
		return new Promise((resolve, reject) => {
			connection = new WebSocket(`${address}?key=${key}`)
				.on('error', e => {
					if (this.connection == null || this.connection === connection) {
						this.connection = null;
						this.sendEvent('end', `Can't connect to gateway: ${e.message}.`);
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

	public async getRequests(): Promise<IRequestContract[]> {
		return this.waitForResponse<IRequestContract[]>(() => this.sendCommand('getRequests'), 'requests');
	}

	public async getStackTrace(requestId: string, threadId: number): Promise<IStackFrameContract[]> {
		return this.waitForResponse<IStackFrameContract[]>(() => this.sendCommand('getStackTrace', {
			requestId: requestId,
			threadId: threadId
		}),                                                'stackTrace');
	}

	public async getVariables(requestId: string, threadId: number, path?: string): Promise<IVariableContract[]> {
		return this.waitForResponse<IVariableContract[]>(() => this.sendCommand('getVariables', {
			requestId: requestId,
			threadId: threadId,
			path: path
		}),                                              'variables');
	}

	public setBreakpoints(breakpoints: {
		path: string,
		scopeId: string
	}[]): void {
		this.sendCommand('setBreakpoints', {
			breakpoints: breakpoints
		});
	}

	public stepOver(requestId: string, threadId: number): void {
		this.sendCommand('stepOver', {
			requestId: requestId,
			threadId: threadId
		});
	}

	public stepIn(requestId: string, threadId: number): void {
		this.sendCommand('stepIn', {
			requestId: requestId,
			threadId: threadId
		});
	}

	public stepOut(requestId: string, threadId: number): void {
		this.sendCommand('stepOut', {
			requestId: requestId,
			threadId: threadId
		});
	}

	// tslint:disable-next-line: no-reserved-keywords
	public continue(requestId: string, threadId: number): void {
		this.sendCommand('continue', {
			requestId: requestId,
			threadId: threadId
		});
	}

	public pause(requestId: string, threadId: number): void {
		this.sendCommand('pause', {
			requestId: requestId,
			threadId: threadId
		});
	}

	public terminateRequests(requests: string[]): void {
		this.sendCommand('terminateRequests', {
			requests: requests
		});
	}

	// tslint:disable-next-line: no-any
	private sendCommand(name: string, args?: any): void {
		if (this.connection === null) {
			return;
		}

		this.connection.send(JSON.stringify({
			name: name,
			arguments: args
		}));
	}

	private parseResponse(data: string): void {
		try {
			// tslint:disable: no-banned-terms
			// tslint:disable: no-unsafe-any
			// tslint:disable-next-line: no-any
			const event: { name: string, arguments: any } = JSON.parse(data.trim());
			// tslint:disable-next-line: switch-default
			switch (event.name) {
				case 'stopOnEntry':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId, event.arguments.operationId, event.arguments.apiId, event.arguments.productId);
					break;
				case 'stopOnStep':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId);
					break;
				case 'stopOnException':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId, event.arguments.operationId, event.arguments.apiId, event.arguments.productId, event.arguments.message);
					break;
				case 'stopOnBreakpoint':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId);
					break;
				case 'threadExited':
					this.sendEvent(event.name, event.arguments.requestId, event.arguments.threadId);
					break;
			}

			const awaiters = this.responseAwaiters[event.name];
			if (awaiters.length > 0) {
				for (const awaiter of awaiters) {
					awaiter(event.arguments);
				}

				delete this.responseAwaiters[event.name];
			}
		} catch {
			return;
		}
	}

	private async waitForResponse<T>(sendCommand: () => void, name: string): Promise<T> {
		return new Promise<T>(resolve => {
			// tslint:disable-next-line: strict-boolean-expressions
			(this.responseAwaiters[name] || (this.responseAwaiters[name] = [])).push(resolve);
			sendCommand();
		});
	}

	// tslint:disable-next-line: no-any
	private sendEvent(event: string, ...args: any[]): any {
		setImmediate(_ => {
			this.emit(event, ...args);
		});
	}
}

export interface IRequestContract {
	id: string;
	threads: number[];
	operationId: string;
	apiId: string;
	productId: string;
}

export interface IStackFrameContract {
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

export interface IVariableContract {
	name: string;
	// tslint:disable-next-line: no-reserved-keywords
	type: string;
	// tslint:disable: no-any
	value: any;
	nestedCount: any;
}
