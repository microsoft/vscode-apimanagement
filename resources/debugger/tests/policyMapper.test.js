"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const Path = require("path");
const policyMapper_1 = require("../policyMapper");
var fs = require('fs');
suite('Policy Mapper', () => {
    const PROJECT_ROOT = Path.join(__dirname, '../../');
    const DATA_ROOT = Path.join(PROJECT_ROOT, 'src/tests/policies/');
    test('empty', () => validatePolicyMap('empty', {
        "policies": {
            "line": 0,
            "endLine": 0,
            "column": 0,
            "endColumn": 10
        }
    }));
    test('default', () => validatePolicyMap('default', {
        "policies": {
            "line": 10,
            "endLine": 10,
            "column": 0,
            "endColumn": 9
        },
        "policies/inbound": {
            "line": 11,
            "endLine": 11,
            "column": 4,
            "endColumn": 14
        },
        "policies/backend": {
            "line": 12,
            "endLine": 12,
            "column": 4,
            "endColumn": 12
        },
        "policies/backend/forward-request": {
            "line": 13,
            "endLine": 13,
            "column": 8,
            "endColumn": 38
        },
        "policies/outbound": {
            "line": 15,
            "endLine": 15,
            "column": 4,
            "endColumn": 15
        },
        "policies/on-error": {
            "line": 16,
            "endLine": 16,
            "column": 4,
            "endColumn": 15
        }
    }));
    test('expressions', () => validatePolicyMap('expressions', {
        "policies": {
            "line": 0,
            "endLine": 0,
            "column": 0,
            "endColumn": 9
        },
        "policies/inbound": {
            "line": 1,
            "endLine": 1,
            "column": 4,
            "endColumn": 12
        },
        "policies/inbound/base": {
            "line": 2,
            "endLine": 2,
            "column": 8,
            "endColumn": 15
        },
        "policies/inbound/rate-limit-by-key": {
            "line": 10,
            "endLine": 10,
            "column": 8,
            "endColumn": 101
        },
        "policies/inbound/set-variable[1]": {
            "line": 6,
            "endLine": 6,
            "column": 8,
            "endColumn": 67
        },
        "policies/inbound/set-variable[2]": {
            "line": 11,
            "endLine": 11,
            "column": 8,
            "endColumn": 113
        },
        "policies/backend": {
            "line": 13,
            "endLine": 13,
            "column": 4,
            "endColumn": 12
        },
        "policies/backend/base": {
            "line": 14,
            "endLine": 14,
            "column": 8,
            "endColumn": 15
        },
        "policies/outbound": {
            "line": 16,
            "endLine": 16,
            "column": 4,
            "endColumn": 13
        },
        "policies/outbound/find-and-replace": {
            "line": 20,
            "endLine": 20,
            "column": 8,
            "endColumn": 96
        },
        "policies/outbound/set-header[1]": {
            "line": 24,
            "endLine": 24,
            "column": 8,
            "endColumn": 64
        },
        "policies/outbound/set-header[2]": {
            "line": 25,
            "endLine": 25,
            "column": 8,
            "endColumn": 68
        },
        "policies/outbound/set-header[3]": {
            "line": 26,
            "endLine": 26,
            "column": 8,
            "endColumn": 58
        },
        "policies/outbound/set-header[4]": {
            "line": 30,
            "endLine": 30,
            "column": 8,
            "endColumn": 64
        },
        "policies/outbound/set-header/value": {
            "line": 31,
            "endLine": 31,
            "column": 12,
            "endColumn": 18
        },
        "policies/outbound/base": {
            "line": 36,
            "endLine": 36,
            "column": 8,
            "endColumn": 15
        },
        "policies/on-error": {
            "line": 38,
            "endLine": 38,
            "column": 4,
            "endColumn": 13
        },
        "policies/on-error/base": {
            "line": 39,
            "endLine": 39,
            "column": 8,
            "endColumn": 15
        }
    }));
    function validatePolicyMap(name, expectedMap) {
        const path = Path.join(DATA_ROOT, `${name}.xml`);
        const xml = fs.readFileSync(path, 'utf8');
        const mapper = new policyMapper_1.PolicyMapper();
        const map = mapper.mapPolicy(xml);
        assert.deepEqual(map, expectedMap);
    }
});
//# sourceMappingURL=policyMapper.test.js.map