/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { validateMcpServerName } from '../src/utils/mcpValidationUtil';

describe('MCP Validation Util', () => {
    describe('validateMcpServerName', () => {
        it('should accept valid names with letters, numbers, and underscores', () => {
            expect(validateMcpServerName('myserver')).to.be.undefined;
            expect(validateMcpServerName('my_server')).to.be.undefined;
            expect(validateMcpServerName('myServer123')).to.be.undefined;
            expect(validateMcpServerName('server_123')).to.be.undefined;
            expect(validateMcpServerName('_server')).to.be.undefined;
            expect(validateMcpServerName('server_')).to.be.undefined;
            expect(validateMcpServerName('123server')).to.be.undefined;
        });

        it('should accept valid names with hyphens when properly bounded', () => {
            expect(validateMcpServerName('my-server')).to.be.undefined;
            expect(validateMcpServerName('my-server-123')).to.be.undefined;
            expect(validateMcpServerName('a-b-c-d')).to.be.undefined;
            expect(validateMcpServerName('server1-server2')).to.be.undefined;
        });

        it('should reject empty or whitespace-only names', () => {
            expect(validateMcpServerName('')).to.equal('Name is required');
            expect(validateMcpServerName('   ')).to.equal('Name is required');
            expect(validateMcpServerName(' \t \n ')).to.equal('Name is required');
        });

        it('should reject names that are too long', () => {
            const longName = 'a'.repeat(81);
            expect(validateMcpServerName(longName)).to.equal('Name must be between 1 and 80 characters long');
        });

        it('should reject names starting or ending with hyphens', () => {
            expect(validateMcpServerName('-myserver')).to.equal('Name can only contain letters, numbers, underscores, and hyphens. If using hyphens, the name must start and end with a letter, number, or underscore.');
            expect(validateMcpServerName('myserver-')).to.equal('Name can only contain letters, numbers, underscores, and hyphens. If using hyphens, the name must start and end with a letter, number, or underscore.');
            expect(validateMcpServerName('-my-server-')).to.equal('Name can only contain letters, numbers, underscores, and hyphens. If using hyphens, the name must start and end with a letter, number, or underscore.');
        });

        it('should reject names with invalid characters', () => {
            expect(validateMcpServerName('my server')).to.equal('Name can only contain letters, numbers, underscores, and hyphens. If using hyphens, the name must start and end with a letter, number, or underscore.');
            expect(validateMcpServerName('my@server')).to.equal('Name can only contain letters, numbers, underscores, and hyphens. If using hyphens, the name must start and end with a letter, number, or underscore.');
            expect(validateMcpServerName('my.server')).to.equal('Name can only contain letters, numbers, underscores, and hyphens. If using hyphens, the name must start and end with a letter, number, or underscore.');
            expect(validateMcpServerName('my/server')).to.equal('Name can only contain letters, numbers, underscores, and hyphens. If using hyphens, the name must start and end with a letter, number, or underscore.');
        });

        it('should handle edge case lengths correctly', () => {
            expect(validateMcpServerName('a')).to.be.undefined; // 1 character
            expect(validateMcpServerName('a'.repeat(80))).to.be.undefined; // 80 characters
        });

        it('should trim whitespace before validation', () => {
            expect(validateMcpServerName('  myserver  ')).to.be.undefined;
            expect(validateMcpServerName('\tmy-server\n')).to.be.undefined;
        });
    });
});
