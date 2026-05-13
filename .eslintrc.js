/* eslint-disable */
module.exports = {
    root: true,
    env: {
        node: true,
        es2022: true,
        jest: true,
        "react-native/react-native": true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
    },
    plugins: [
        "@typescript-eslint",
        "@stylistic",
        "react",
        "react-hooks",
        "react-native",
    ],
    extends: [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "prettier",
    ],
    settings: {
        react: { version: "detect" },
    },
    rules: {
        // CLAUDE.md 컨벤션: Allman 중괄호 + 4-space
        "@stylistic/brace-style": ["error", "allman", { allowSingleLine: true }],
        "@stylistic/indent": [
            "error",
            4,
            {
                SwitchCase: 1,
                ignoredNodes: [
                    "JSXElement",
                    "JSXElement > *",
                    "JSXAttribute",
                    "JSXIdentifier",
                    "JSXNamespacedName",
                    "JSXMemberExpression",
                    "JSXSpreadAttribute",
                    "JSXExpressionContainer",
                    "JSXOpeningElement",
                    "JSXClosingElement",
                    "JSXFragment",
                    "JSXOpeningFragment",
                    "JSXClosingFragment",
                    "JSXText",
                    "JSXEmptyExpression",
                    "JSXSpreadChild",
                ],
            },
        ],
        "@stylistic/no-trailing-spaces": "error",
        "@stylistic/eol-last": ["error", "always"],
        "@stylistic/no-multiple-empty-lines": ["error", { max: 1, maxEOF: 0 }],
        "@stylistic/semi": ["error", "always"],
        "@stylistic/quotes": ["error", "double", { avoidEscape: true, allowTemplateLiterals: true }],

        // TypeScript
        "@typescript-eslint/no-explicit-any": "error",
        "@typescript-eslint/no-unused-vars": [
            "error",
            { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
        ],
        "@typescript-eslint/no-var-requires": "off",

        // React
        "react/react-in-jsx-scope": "off", // RN/Expo with new JSX transform
        "react/prop-types": "off",         // TS handles this

        // React Native
        "react-native/no-unused-styles": "warn",
        "react-native/no-inline-styles": "off",
        "react-native/no-color-literals": "off",
    },
    ignorePatterns: [
        "node_modules/",
        ".expo/",
        "dist/",
        "web-build/",
        "coverage/",
        "android/",
        "ios/",
        "*.config.js",
        "babel.config.js",
        "metro.config.js",
        "jest.config.js",
        ".eslintrc.js",
        "expo-env.d.ts",
    ],
};
