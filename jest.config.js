/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

/** @type {import('ts-jest').JestConfigWithTsJest} */
const config = {
    // Indicates whether the coverage information should be collected while executing the test
    collectCoverage: true,

    // Indicates which provider should be used to instrument code for coverage
    coverageProvider: "v8",

    // A preset that is used as a base for Jest's configuration
    preset: "ts-jest",

    // A list of paths to directories that Jest should use to search for files in
    roots: ["<rootDir>/src/"],
};

module.exports = config;
