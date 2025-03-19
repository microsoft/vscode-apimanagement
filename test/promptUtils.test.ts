/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { ext } from '../src/extensionVariables';
import { loadPromptTemplate } from '../src/utils/promptUtils';

describe('Prompt Utils', () => {
    const promptsDir = path.join(__dirname, 'resources', 'prompts');
    const resourcesDir = path.join(__dirname, 'resources');

    beforeEach(() => {
        // Setup mock extension path
        ext.context = {
            extensionPath: __dirname
        } as any;

        // Create test directories one by one
        if (!fs.existsSync(resourcesDir)) {
            fs.mkdirSync(resourcesDir);
        }
        if (!fs.existsSync(promptsDir)) {
            fs.mkdirSync(promptsDir);
        }
    });

    afterEach(() => {
        // Cleanup test files and directories
        if (fs.existsSync(path.join(promptsDir, 'test.md'))) {
            fs.unlinkSync(path.join(promptsDir, 'test.md'));
        }
        if (fs.existsSync(promptsDir)) {
            fs.rmdirSync(promptsDir);
        }
        if (fs.existsSync(resourcesDir)) {
            fs.rmdirSync(resourcesDir);
        }
    });

    it('should replace placeholders correctly in template', () => {
        const promptContent = 'Hello ${name}, your age is ${age}';
        fs.writeFileSync(path.join(promptsDir, 'test.md'), promptContent);

        const result = loadPromptTemplate('test.md', {
            name: 'John',
            age: '30'
        });

        assert.strictEqual(result, 'Hello John, your age is 30');
    });

    it('should leave non-existent placeholders unchanged', () => {
        const promptContent = 'Hello ${name}, ${nonexistent}';
        fs.writeFileSync(path.join(promptsDir, 'test.md'), promptContent);

        const result = loadPromptTemplate('test.md', {
            name: 'John'
        });

        assert.strictEqual(result, 'Hello John, ${nonexistent}');
    });

    it('should replace multiple occurrences of same placeholder', () => {
        const promptContent = '${name} ${name} ${name}';
        fs.writeFileSync(path.join(promptsDir, 'test.md'), promptContent);

        const result = loadPromptTemplate('test.md', {
            name: 'John'
        });

        assert.strictEqual(result, 'John John John');
    });

    it('should throw error for non-existent template file', () => {
        const nonExistentFile = 'nonexistent.md';
        const expectedPath = path.join(__dirname, 'resources', 'prompts', nonExistentFile);
        
        assert.throws(
            () => loadPromptTemplate(nonExistentFile, { name: 'John' }),
            (error: Error) => {
                assert.ok(error instanceof Error);
                assert.ok(error.message.includes('ENOENT') && error.message.includes(expectedPath));
                return true;
            }
        );
    });
});