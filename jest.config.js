/** @type {import('jest').Config} */
module.exports = {
    preset: "jest-expo",
    testEnvironment: "node",
    setupFiles: ["<rootDir>/jest.setup.js"],
    transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@solana/.*|@solana-mobile/.*|@noble/.*|@scure/.*|jayson|rpc-websockets|uuid|superstruct|bs58|borsh|bigint-buffer))",
    ],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    testMatch: [
        "**/__tests__/**/*.test.ts",
        "**/__tests__/**/*.test.tsx",
        "**/?(*.)+(test).ts",
        "**/?(*.)+(test).tsx",
    ],
    collectCoverageFrom: [
        "src/**/*.{ts,tsx}",
        "!src/**/*.d.ts",
        "!src/**/index.ts",
    ],
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0,
        },
    },
};
