import { PolicySource } from "./policySource";
import { UiThread } from "./uiThread";

// tslint:disable: indent
// tslint:disable: export-name

export class UiRequest {

	public id: string;
	public threads: UiThread[];
	private operationId: string;
	private apiId: string;
	private productId: string;

	constructor(id: string, operationId: string, apiId: string, productId: string) {
		this.id = id;
		this.threads = [];

		this.operationId = operationId;
		this.apiId = apiId;
		this.productId = productId;
	}

	public addNewThread(gatewayThread: number, policySource: PolicySource): UiThread {
		let thread: UiThread;
		this.threads.push(thread = new UiThread(gatewayThread, this.operationId, this.apiId, this.productId, policySource));
		return thread;
	}

	public findThreadByStackFrameId(id: number): UiThread | null {
		for (const thread of this.threads) {
			if (thread.containsStackFrame(id)) {
				return thread;
			}
		}

		return null;
	}

	public findThreadById(id: number): UiThread | null {
		for (const thread of this.threads) {
			if (thread.id === id) {
				return thread;
			}
		}

		return null;
	}

	public findThreadByUiId(uiId: number): UiThread | null {
		for (const thread of this.threads) {
			if (thread.uiId === uiId) {
				return thread;
			}
		}

		return null;
	}
}
