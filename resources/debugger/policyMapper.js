"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class PolicyMapper {
    mapPolicy(xml) {
        this.index = 0;
        this.xml = xml;
        this.count = {};
        this.map = {};
        this.stack = [];
        this.line = 0;
        this.column = 0;
        while (this.index < this.xml.length && (this.xmlComment() || this.element()))
            ;
        return this.map;
    }
    element() {
        this.captureLocation();
        let nameStart = -1;
        let name = null;
        let start = null;
        let end = null;
        let selfClosing = false;
        let closing = false;
        while (this.index < this.xml.length) {
            const char = this.xml[this.index];
            if (char == '<') {
                if (!start) {
                    start = [this.line, this.column];
                }
            }
            else if (char == '/') {
                if (!name) {
                    if (nameStart > 0 && !name) {
                        name = this.xml.substring(nameStart, this.index);
                        this.stack.push(name);
                    }
                    else {
                        break;
                    }
                }
                if (!end) {
                    selfClosing = true;
                }
                else {
                    closing = true;
                }
            }
            else if (char == '>') {
                if (nameStart > 0 && !name) {
                    name = this.xml.substring(nameStart, this.index);
                    this.stack.push(name);
                }
                if (!end) {
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
            }
            else if (char == '<') {
                if (end) {
                    closing = true;
                }
                else {
                    break;
                }
            }
            else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) >= 0) {
                if (nameStart >= 0 && !name) {
                    name = this.xml.substring(nameStart, this.index);
                    this.stack.push(name);
                }
                if (name && !end && this.attributes()) {
                    continue;
                }
            }
            else if (PolicyMapper.NameCharacters.indexOf(char) >= 0) {
                if (start && nameStart < 0) {
                    nameStart = this.index;
                }
                else if (name && !closing) {
                    break;
                }
            }
            else {
                break;
            }
            this.advance();
        }
        this.backtrack();
        return false;
    }
    xmlComment() {
        this.captureLocation();
        let openCount = 0;
        let closeCount = 0;
        while (this.index < this.xml.length) {
            const char = this.xml[this.index];
            if (char == '<') {
                if (openCount == 0) {
                    openCount++;
                }
            }
            else if (char == '!') {
                if (openCount == 1) {
                    openCount++;
                }
                else {
                    openCount = 0;
                }
            }
            else if (char == '-') {
                if (openCount == 2 || openCount == 3) {
                    openCount++;
                }
                else if (openCount == 4) {
                    if (closeCount < 2) {
                        closeCount++;
                    }
                    else {
                        closeCount = 0;
                    }
                }
                else {
                    break;
                }
            }
            else if (char == '>') {
                if (closeCount == 2) {
                    this.advance();
                    return true;
                }
            }
            else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) >= 0) {
                if (openCount > 0 && openCount < 4) {
                    break;
                }
                closeCount = 0;
            }
            else {
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
    attributes() {
        let any = false;
        while (this.attribute()) {
            any = true;
        }
        return any;
    }
    attribute() {
        this.captureLocation();
        let nameStart = -1;
        let name = null;
        let hasValue = false;
        while (this.index < this.xml.length) {
            const char = this.xml[this.index];
            if (char == '=') {
                if (nameStart >= 0 && !name) {
                    name = this.xml.substring(nameStart, this.index);
                }
                if (!name) {
                    break;
                }
            }
            else if (char == '"') {
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
                }
                else {
                    break;
                }
            }
            else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) >= 0) {
                if (hasValue) {
                    return true;
                }
                if (nameStart >= 0) {
                    name = this.xml.substring(nameStart, this.index);
                }
            }
            else if (PolicyMapper.NameCharacters.indexOf(char) >= 0) {
                if (nameStart < 0) {
                    nameStart = this.index;
                }
            }
            else {
                break;
            }
            this.advance();
        }
        this.backtrack();
        return false;
    }
    expression() {
        this.captureLocation();
        let at = false;
        let openingBracket = null;
        let closingBracket = null;
        let bracketDepth = -1;
        while (this.index < this.xml.length) {
            const char = this.xml[this.index];
            if (char == '@') {
                if (at) {
                    break;
                }
                at = true;
            }
            else if (char == '{' || char == '(') {
                if (!at) {
                    break;
                }
                if (!openingBracket) {
                    openingBracket = char;
                    closingBracket = char == '{' ? '}' : ')';
                    bracketDepth = 0;
                }
                else if (openingBracket == char) {
                    bracketDepth++;
                }
            }
            else if (char == '}' || char == ')') {
                if (!openingBracket) {
                    break;
                }
                if (closingBracket == char && --bracketDepth <= 0) {
                    this.advance();
                    return true;
                }
            }
            else if (bracketDepth >= 0) {
                // Just advance.
            }
            else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) >= 0) {
                // Just advance.
            }
            else {
                break;
            }
            this.advance();
        }
        this.backtrack();
        return false;
    }
    simpleValue(terminator, allowEmpty) {
        this.captureLocation();
        let empty = true;
        while (this.index < this.xml.length) {
            const char = this.xml[this.index];
            if (char == terminator) {
                if (empty && !allowEmpty) {
                    break;
                }
                return true;
            }
            else if (PolicyMapper.WhiteSpaceCharacters.indexOf(char) < 0) {
                empty = false;
            }
            this.advance();
        }
        this.backtrack();
        return false;
    }
    elementValue() {
        let any = false;
        while (this.expression() || this.xmlComment() || this.element() || this.simpleValue('<', false)) {
            any = true;
        }
        return any;
    }
    advance() {
        if (this.xml[this.index] == '\n') {
            this.line++;
            this.column = 0;
        }
        else {
            this.column++;
        }
        this.index++;
    }
    addElementToMap(start, end) {
        let key = this.stack.reduce((a, b) => `${a}/${b}`);
        if (this.count[key]) {
            this.count[key] += 1;
            key = `${key}[${this.count[key]}]`;
        }
        else if (this.map[key]) {
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
    captureLocation() {
        this.capturedLocation = {
            line: this.line,
            column: this.column,
            index: this.index
        };
    }
    backtrack() {
        this.line = this.capturedLocation.line;
        this.column = this.capturedLocation.column;
        this.index = this.capturedLocation.index;
    }
}
PolicyMapper.WhiteSpaceCharacters = " \r\n\t";
PolicyMapper.NameCharacters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-:";
exports.PolicyMapper = PolicyMapper;
//# sourceMappingURL=policyMapper.js.map