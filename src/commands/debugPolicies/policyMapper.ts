import { nonNullValue } from "../../utils/nonNull";

// tslint:disable: indent
export class PolicyMapper {
	public static WhiteSpaceCharacters: string = " \r\n\t";
	public static NameCharacters: string = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-:";

	private index: number;
	private xml: string;
	private map: IPolicyMap;
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

	public mapPolicy(xml: string): IPolicyMap {
		this.index = 0;
		this.xml = xml;
		this.count = {};
		this.map = {};
		this.stack = [];
		this.line = 0;
		this.column = 0;

		// tslint:disable-next-line: no-empty
		while (this.index < this.xml.length && (this.xmlComment() || this.element())) { }

		return this.map;
	}

	// tslint:disable-next-line: cyclomatic-complexity
	private element(): boolean {
		this.captureLocation();

		let nameStart = -1;
		let name: string | undefined;
		let start: [number, number] | undefined;
		let end: [number, number] | undefined;
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
						this.stack.push(name);
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
					this.stack.push(name);
				}

				if (!end) {
					end = [this.line, this.column];
					this.addElementToMap(nonNullValue(start), end);
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
					this.stack.push(name);
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

	private xmlComment(): boolean {
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

	// tslint:disable-next-line: no-any
	private attributes(): any {
		let hasAttribute: boolean = false;
		while (this.attribute()) {
			hasAttribute = true;
		}
		return hasAttribute;
	}

	private attribute(): boolean {
		this.captureLocation();

		let nameStart = -1;
		let name: string | undefined;
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
					// tslint:disable-next-line: align
				} if (this.simpleValue('"', true)) {
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

	private expression(): boolean {
		this.captureLocation();

		let at = false;
		let openingBracket: string | undefined;
		let closingBracket: string | undefined;
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

	private simpleValue(terminator: string, allowEmpty: boolean): boolean {
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

	private elementValue(): boolean {
		let hasAny = false;
		while (this.expression() || this.xmlComment() || this.element() || this.simpleValue('<', false)) {
			hasAny = true;
		}
		return hasAny;
	}

	private advance(): void {
		if (this.xml[this.index] === '\n') {
			this.line++;
			this.column = 0;
		} else {
			this.column++;
		}
		this.index++;
	}

	private addElementToMap(start: [number, number], end: [number, number]): void {
		let key = this.stack.reduce((a, b) => `${a}/${b}`);

		if (this.count[key] !== undefined) {
			this.count[key] += 1;
			key = `${key}[${this.count[key]}]`;
		} else if (this.map[key] !== undefined) {
			this.count[key] = 2;
			this.map[`${key}[1]`] = this.map[key];
			delete this.map[key];
			key = `${key}[2]`;
		}

		this.map[key] = {
			line: start[0],
			endLine: end[0],
			column: start[1],
			endColumn: end[1]
		};
	}

	private captureLocation(): void {
		this.capturedLocation = {
			line: this.line,
			column: this.column,
			index: this.index
		};
	}

	private backtrack(): void {
		this.line = this.capturedLocation.line;
		this.column = this.capturedLocation.column;
		this.index = this.capturedLocation.index;
	}
}

export interface IPolicyMap {
	[path: string]: IPolicyLocation;
}

export interface IPolicyLocation {
	line: number;
	endLine: number;
	column: number;
	endColumn: number;
}
