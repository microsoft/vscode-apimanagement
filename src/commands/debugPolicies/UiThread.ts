import { StackFrame } from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { IStackFrameContract, StackFrameScopeContract } from './debuggerConnection';
import { PolicySource } from './PolicySource';

// tslint:disable: indent
interface IPendingSource {
	scopeId: string;
	stackFrames: StackFrame[];
}

export class UiThread {

	private static NextThreadId: number = 1;
	private static NextStackFrameId: number = 1;

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

	private static addPendingSource(pendingSources: IPendingSource[], frame: IStackFrameContract, stackFrame: StackFrame): void {
		let pendingSource = pendingSources.find(s => s.scopeId === frame.scopeId);
		if (!pendingSource) {
			pendingSources.push(pendingSource = {
				scopeId: frame.scopeId,
				stackFrames: []
			});
		}
		pendingSource.stackFrames.push(stackFrame);
	}

	public containsStackFrame(id: number): boolean {
		// tslint:disable: no-for-in
		// tslint:disable-next-line: no-for-in-array
		for (const key in Object.keys(this.stackFrames)) {
			if (this.stackFrames[key].id === id) {
				return true;
			}
		}
		return false;
	}

	// tslint:disable-next-line: cyclomatic-complexity
	public async getStackFrames(frames: IStackFrameContract[]): Promise<StackFrame[]> {
		if (frames.length === 0) {
			return [];
		}

		// Create UI stack frames
		const stack: {
			key: string,
			frame: IStackFrameContract,
			isVirtual: boolean,
			stackFrame: StackFrame
		}[] = [];
		const allFrames = this.addVirtualStack(frames);
		const pendingSources: IPendingSource[] = [];
		let prevFrame: IStackFrameContract | undefined;
		let path: string[] = [];
		for (const frame of allFrames.reverse()) {
			if (path.length === 0 || prevFrame !== undefined && (prevFrame.scopeId !== frame.scopeId)) {
				path = ['policies', frame.section];
			}
			prevFrame = frame;
			// change here
			path.push(frame.index > 0 ? `${frame.name}[${frame.index}]` : frame.name);
			const stackFrameKey = path.join('/');

			stack.push({
				key: stackFrameKey,
				frame: frame,
				// tslint:disable-next-line: no-non-null-assertion
				isVirtual: frame.isVirtual!,
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
				stackFrame.source = policy.source;
			}

			if (stackFrame.endLine !== undefined && stackFrame.endColumn !== undefined) {
				const location = this.policySource.getPolicyLocation(frame.scopeId, item.key);
				if (location) {
					stackFrame.line = location.line;
					stackFrame.column = location.column;
					stackFrame.endLine = location.endLine;
					stackFrame.endColumn = location.endColumn;
				}
			}
		}

		// Remove any 'virtual' UI stack frames if no policy present
		for (let index = 0; index < stack.length;) {
			// tslint:disable-next-line: strict-boolean-expressions
			if (stack[index].isVirtual && (stack[index].stackFrame.source !== undefined || !stack[index].stackFrame.line && !stack[index].stackFrame.column)) {
				stack.splice(index, 1);
			} else {
				index++;
			}
		}

		return stack.map(s => s.stackFrame).reverse();
	}

	private addVirtualStack(frames: IStackFrameContract[]): (IStackFrameContract & { isVirtual?: true })[] {
		const allFrames: (IStackFrameContract & { isVirtual?: true })[] = [...frames];

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

	private getStackFrame(frame: IStackFrameContract, path: string, pendingSources: IPendingSource[]): StackFrame {
		const frameKey = `${frame.scopeId}/${path}`;
		let stackFrame = this.stackFrames[frameKey];
		if (stackFrame !== undefined) {
			this.stackFrames[frameKey] = stackFrame = new StackFrame(UiThread.NextStackFrameId++, frame.name);
			const policy = this.policySource.getPolicy(frame.scopeId);
			stackFrame.source = policy.source;
			if (stackFrame.source !== undefined) {
				UiThread.addPendingSource(pendingSources, frame, stackFrame);
			}
		}

		return stackFrame;
	}
}
