
// tslint:disable: no-unsafe-any
// tslint:disable: indent
// tslint:disable: export-name
// tslint:disable: strict-boolean-expressions
// tslint:disable: typedef
// tslint:disable: no-non-null-assertion
// tslint:disable: no-for-in
// tslint:disable: forin
// tslint:disable: no-any
// tslint:disable: no-reserved-keywords
// tslint:disable: interface-name
// tslint:disable: no-empty
// tslint:disable: prefer-template

export class PolicyMapper {
	public static WhiteSpaceCharacters = " \r\n\t";
	public static NameCharacters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-:";

	private index: number;
	private xml: string;
	private map: PolicyMap;
	private count: {
		[key: string]: number
	};
	private stack: string[];
	private line: number;
	private column: number;
	private capturedLocation: {
		line: number,
		column: number,
		index: number;
	};

	public mapPolicy(xml: string) {
		this.index = 0;
		this.xml = xml;
		this.count = {};
		this.map = {};
		this.stack = [];
		this.line = 0;
		this.column = 0;

		while (this.index < this.xml.length && (this.xmlComment() || this.element())) { }

		return this.map;
	}

	// tslint:disable: cyclomatic-complexity
	// tslint:disable: max-func-body-length
	private element() {
		this.captureLocation();

		let nameStart = -1;
		let name: string | null = null;
		let start: [number, number] | null = null;
		let end: [number, number] | null = null;
		let selfClosing = false;
		let closing = false;
		while (this.index < this.xml.length) {
			const char = this.xml[this.index];
			if (char === '<') {
				if (!start) {
					start = [this.line, this.column];
				}
			} else if (char === '/') {
				if (!name) {
					if (nameStart > 0 && !name) {
						name = this.xml.substring(nameStart, this.index);
						const curkey = this.stack.length === 0 ? `${name}[1]` : this.stack.join('/') + `/${name}[1]`;
						//const curkey = this.stack.reduce((a, b) => `${a}/${b}`) + `${name}[1]`;
						if (this.count[curkey]) {
							this.stack.push(name + `[${this.count[curkey] + 1}]`);
							this.count[curkey]++;
						} else {
							this.stack.push(name + `[1]`);
							this.count[curkey] = 1;
						}
					} else {
						break;
					}
				}

				if (!end) {
					selfClosing = true;
				} else {
					closing = true;
				}
			} else if (char === '>') {
				if (nameStart > 0 && !name) {
					name = this.xml.substring(nameStart, this.index);
					const curkey = this.stack.length === 0 ? `${name}[1]` : this.stack.join('/') + `/${name}[1]`;
					if (this.count[curkey]) {
						this.stack.push(name + `[${this.count[curkey] + 1}]`);
						this.count[curkey]++;
					} else {
						this.stack.push(name + `[1]`);
						this.count[curkey] = 1;
					}
				}

				if (!end && start !== null) {
					end = [this.line, this.column];
					this.addElementToMap(start, end);
				}

				this.advance();
				if (closing || selfClosing) {
					this.stack.pop();
					return true;
				}

				if (this.elementValue()) {
					continue;
				}
			} else if (char === '<') {
				if (end) {
					closing = true;
				} else {
					break;
				}
			} else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) >= 0) {
				if (nameStart >= 0 && !name) {
					name = this.xml.substring(nameStart, this.index);
					const curkey = this.stack.length === 0 ? `${name}[1]` : this.stack.join('/') + `/${name}[1]`;
					if (this.count[curkey]) {
						this.stack.push(name + `[${this.count[curkey] + 1}]`);
						this.count[curkey]++;
					} else {
						this.stack.push(name + `[1]`);
						this.count[curkey] = 1;
					}
				}

				if (name && !end && this.attributes()) {
					continue;
				}
			} else if (PolicyMapper.NameCharacters.indexOf(char) >= 0) {
				if (start && nameStart < 0) {
					nameStart = this.index;
				} else if (name && !closing) {
					break;
				}
			} else {
				break;
			}

			this.advance();
		}

		this.backtrack();
		return false;
	}

	private xmlComment() {
		this.captureLocation();

		let openCount = 0;
		let closeCount = 0;
		while (this.index < this.xml.length) {
			const char = this.xml[this.index];
			if (char === '<') {
				if (openCount === 0) {
					openCount++;
				}
			} else if (char === '!') {
				if (openCount === 1) {
					openCount++;
				} else {
					openCount = 0;
				}
			} else if (char === '-') {
				if (openCount === 2 || openCount === 3) {
					openCount++;
				} else if (openCount === 4) {
					if (closeCount < 2) {
						closeCount++;
					} else {
						closeCount = 0;
					}
				} else {
					break;
				}
			} else if (char === '>') {
				if (closeCount === 2) {
					this.advance();
					return true;
				}
			} else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) >= 0) {
				if (openCount > 0 && openCount < 4) {
					break;
				}

				closeCount = 0;
			} else {
				if (openCount < 4) {
					break;
				}

				closeCount = 0;
			}

			this.advance();
		}

		this.backtrack();
		return false;
	}

	private attributes() {
		let flag = false;
		while (this.attribute()) {
			flag = true;
		}
		return flag;
	}

	private attribute() {
		this.captureLocation();

		let nameStart = -1;
		let name: string | null = null;
		let hasValue = false;
		while (this.index < this.xml.length) {
			const char = this.xml[this.index];
			if (char === '=') {
				if (nameStart >= 0 && !name) {
					name = this.xml.substring(nameStart, this.index);
				}

				if (!name) {
					break;
				}
			} else if (char === '"') {
				if (!name) {
					break;
				}

				if (hasValue) {
					this.advance();
					return true;
				}

				this.advance();
				if (this.expression()) {
					hasValue = true;
				}
				if (this.simpleValue('"', true)) {
					hasValue = true;
					continue;
				} else {
					break;
				}
			} else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) >= 0) {
				if (hasValue) {
					return true;
				}

				if (nameStart >= 0) {
					name = this.xml.substring(nameStart, this.index);
				}
			} else if (PolicyMapper.NameCharacters.indexOf(char) >= 0) {
				if (nameStart < 0) {
					nameStart = this.index;
				}
			} else {
				break;
			}

			this.advance();
		}

		this.backtrack();
		return false;
	}

	private expression() {
		this.captureLocation();

		let at = false;
		let openingBracket: string | null = null;
		let closingBracket: string | null = null;
		let bracketDepth = -1;
		while (this.index < this.xml.length) {
			const char = this.xml[this.index];

			if (char === '@') {
				if (at) {
					break;
				}

				at = true;
			} else if (char === '{' || char === '(') {
				if (!at) {
					break;
				}

				if (!openingBracket) {
					openingBracket = char;
					closingBracket = char === '{' ? '}' : ')';
					bracketDepth = 0;
				} else if (openingBracket === char) {
					bracketDepth++;
				}
			} else if (char === '}' || char === ')') {
				if (!openingBracket) {
					break;
				}

				if (closingBracket === char && --bracketDepth <= 0) {
					this.advance();
					return true;
				}
			} else if (bracketDepth >= 0) {
				// Just advance.
			} else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) >= 0) {
				// Just advance.
			} else {
				break;
			}

			this.advance();
		}

		this.backtrack();
		return false;
	}

	private simpleValue(terminator: string, allowEmpty: boolean) {
		this.captureLocation();

		let empty = true;
		while (this.index < this.xml.length) {
			const char = this.xml[this.index];

			if (char === terminator) {
				if (empty && !allowEmpty) {
					break;
				}
				return true;
			} else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) < 0) {
				empty = false;
			}

			this.advance();
		}

		this.backtrack();
		return false;
	}

	private elementValue() {
		let flag = false;
		while (this.expression() || this.xmlComment() || this.element() || this.simpleValue('<', false)) {
			flag = true;
		}
		return flag;
	}

	private advance() {
		if (this.xml[this.index] === '\n') {
			this.line++;
			this.column = 0;
		} else {
			this.column++;
		}
		this.index++;
	}

	private addElementToMap(start: [number, number], end: [number, number]) {
		const key = this.stack.reduce((a, b) => `${a}/${b}`);

		this.map[key] = {
			line: start[0],
			endLine: end[0],
			column: start[1],
			endColumn: end[1]
		};
	}

	private captureLocation() {
		this.capturedLocation = {
			line: this.line,
			column: this.column,
			index: this.index
		};
	}

	private backtrack() {
		this.line = this.capturedLocation.line;
		this.column = this.capturedLocation.column;
		this.index = this.capturedLocation.index;
	}
}

export interface PolicyMap {
	[path: string]: PolicyLocation;
}

export interface PolicyLocation {
	line: number;
	endLine: number;
	column: number;
	endColumn: number;
}
