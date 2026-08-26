// @ts-check
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "out/**",
            "dist/**",
            "node_modules/**",
            "**/*.d.ts",
            "esbuild.js",
            "main.js",
            ".vscode-test/**"
        ]
    },
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts", "test/**/*.ts"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-inferrable-types": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-empty-object-type": "off",
            "@typescript-eslint/no-namespace": "off",
            "@typescript-eslint/no-require-imports": "off",
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/no-this-alias": "off",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "no-empty": "off",
            "no-useless-escape": "off",
            "no-async-promise-executor": "off",
            "prefer-const": "off",
            "no-var": "off"
        }
    }
);
