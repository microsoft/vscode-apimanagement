import { StackFrame } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { StackFrameContract, StackFrameScopeContract } from './debuggerConnection';
import { PolicySource } from './policySource';

// tslint:disable: no-unsafe-any
// tslint:disable: indent
// tslint:disable: export-name
// tslint:disable: strict-boolean-expressions
// tslint:disable: typedef
// tslint:disable: no-non-null-assertion
// tslint:disable: no-for-in
// tslint:disable: forin
// tslint:disable: interface-name

interface PendingSource {
	scopeId: string;
	stackFrames: StackFrame[];
}

export class UiThread {
	private static NextThreadId = 1;
	private static NextStackFrameId = 1;

	public id: number;
	public uiId: number;

	private operationId: string;
	private apiId: string;
	private productId: string;
	private stackFrames: {
		[key: string]: StackFrame
	} = {};
	private policySource: PolicySource;

	constructor(id: number, operationId: string, apiId: string, productId: string, policySource: PolicySource) {
		this.id = id;
		this.uiId = UiThread.NextThreadId++;

		this.operationId = operationId;
		this.apiId = apiId;
		this.productId = productId;
		this.policySource = policySource;
	}

	private static addPendingSource(pendingSources: PendingSource[], frame: StackFrameContract, stackFrame: StackFrame) {
		let pendingSource = pendingSources.find(s => s.scopeId === frame.scopeId);
		if (!pendingSource) {
			pendingSources.push(pendingSource = {
				scopeId: frame.scopeId,
				stackFrames: []
			});
		}

		pendingSource.stackFrames.push(stackFrame);
	}

	public containsStackFrame(id: number) {
		for (const key in this.stackFrames) {
			if (this.stackFrames[key].id === id) {
				return true;
			}
		}

		return false;
	}

	// tslint:disable-next-line: cyclomatic-complexity
	public async getStackFrames(frames: StackFrameContract[]) {
		if (!frames.length) {
			return [];
		}

		// Create UI stack frames
		const stack: {
			key: string,
			frame: StackFrameContract,
			isVirtual?: boolean,
			stackFrame: StackFrame
		}[] = [];
		const allFrames = this.addVirtualStack(frames);
		const pendingSources: PendingSource[] = [];
		let prevFrame: StackFrameContract | null = null;
		let path: string[] = [];
		for (const frame of allFrames.reverse()) {
			if (!path.length || prevFrame && (prevFrame.scopeId !== frame.scopeId)) {
				path = ['policies[1]', frame.section + "[1]"];
			}
			prevFrame = frame;
			if (!frame.name.endsWith(']')) {
				path.push(`${frame.name}[${frame.index || 1}]`);
			} else {
				path.push(`${frame.name}`);
			}
			const stackFrameKey = path.join('/');

			stack.push({
				key: stackFrameKey,
				frame: frame,
				isVirtual: frame.isVirtual,
				stackFrame: this.getStackFrame(frame, stackFrameKey, pendingSources)
			});
		}

		// Fetch any sources if necessary
		if (pendingSources.length > 0) {
			await this.policySource.fetchPolicies(pendingSources.map(p => p.scopeId));
		}

		// Assign source line numbers as per scope, name, and index
		for (const item of stack) {
			const frame = item.frame;
			const stackFrame = <DebugProtocol.StackFrame>item.stackFrame;

			if (!stackFrame.source) {
				const policy = this.policySource.getPolicy(frame.scopeId);
				stackFrame.source = policy && policy.source;
			}

			// if (!stackFrame.line && !stackFrame.column && !stackFrame.endLine && !stackFrame.endColumn) {
			// 	const location = this.policySource.getPolicyLocation(frame.scopeId, item.key);
			// 	if (location) {
			// 		stackFrame.line = location.line;
			// 		stackFrame.column = location.column;
			// 		stackFrame.endLine = location.endLine;
			// 		stackFrame.endColumn = location.endColumn;
			// 	}
			// }
			const location = this.policySource.getPolicyLocation(frame.scopeId, item.key);
			if (location) {
				stackFrame.line = location.line;
				stackFrame.column = location.column;
				stackFrame.endLine = location.endLine;
				stackFrame.endColumn = location.endColumn;
			}
		}

		// Remove any 'virtual' UI stack frames if no policy present
		for (let index = 0; index < stack.length;) {
			if (stack[index].isVirtual && (!stack[index].stackFrame.source || !stack[index].stackFrame.line && !stack[index].stackFrame.column)) {
				stack.splice(index, 1);
			} else {
				index++;
			}
		}

		return stack.map(s => s.stackFrame).reverse();
	}

	private addVirtualStack(frames: StackFrameContract[]): (StackFrameContract & { isVirtual?: true })[] {
		const allFrames: (StackFrameContract & { isVirtual?: true })[] = [...frames];

		let lastFrame = allFrames[frames.length - 1];
		if (lastFrame.scopeId === StackFrameScopeContract.tenant && this.productId) {
			allFrames.push(lastFrame = {
				scopeId: `/products/${this.productId}`,
				name: 'base',
				section: lastFrame.section,
				index: 0,
				isVirtual: true
			});
		}

		if ((lastFrame.scopeId === StackFrameScopeContract.tenant || lastFrame.scopeId.startsWith(StackFrameScopeContract.product)) && this.apiId) {
			allFrames.push(lastFrame = {
				scopeId: `/apis/${this.apiId}`,
				name: 'base',
				section: lastFrame.section,
				index: 0,
				isVirtual: true
			});
		}

		if (lastFrame.scopeId.startsWith(StackFrameScopeContract.api) && !lastFrame.scopeId.includes('/operations/') && this.apiId && this.operationId) {
			allFrames.push(lastFrame = {
				scopeId: `/apis/${this.apiId}/operations/${this.operationId}`,
				name: 'base',
				section: lastFrame.section,
				index: 0,
				isVirtual: true
			});
		}

		return allFrames;
	}

	private getStackFrame(frame: StackFrameContract, path: string, pendingSources: PendingSource[]) {
		const frameKey = `${frame.scopeId}/${path}`;
		let stackFrame = this.stackFrames[frameKey];
		if (!stackFrame) {
			this.stackFrames[frameKey] = stackFrame = new StackFrame(UiThread.NextStackFrameId++, frame.name);
			const policy = this.policySource.getPolicy(frame.scopeId);
			stackFrame.source = policy && policy.source;
			if (!stackFrame.source) {
				UiThread.addPendingSource(pendingSources, frame, stackFrame);
			}
		}

		return stackFrame;
	}
}
