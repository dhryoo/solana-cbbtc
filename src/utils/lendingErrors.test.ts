import {
    isAuthFailure,
    isInsufficientFunds,
    isNoBorrowsToRepay,
    isOracleStaleError,
    isUserRejection,
    isWalletTimeout,
} from "./lendingErrors";

describe("isOracleStaleError", () =>
{
    it("matches 6039 / PriceTooOld", () =>
    {
        expect(isOracleStaleError("custom 6039 PriceTooOld")).toBe(true);
    });

    it("matches 6009 / ReserveStale", () =>
    {
        expect(isOracleStaleError("ReserveStale: Reserve state needs to be refreshed")).toBe(true);
    });

    it("does not match unrelated", () =>
    {
        expect(isOracleStaleError("InvalidAmount 6003")).toBe(false);
    });
});

describe("isUserRejection", () =>
{
    it("matches Android CancellationException", () =>
    {
        expect(isUserRejection("java.util.concurrent.CancellationException")).toBe(true);
    });

    it("matches generic 'rejected'", () =>
    {
        expect(isUserRejection("User rejected the request")).toBe(true);
    });
});

describe("isInsufficientFunds", () =>
{
    it("matches insufficient lamports", () =>
    {
        expect(isInsufficientFunds("insufficient lamports 4221054, need 8073600")).toBe(true);
    });
});

describe("isAuthFailure", () =>
{
    it("matches -1/authorization request failed", () =>
    {
        expect(isAuthFailure("-1/authorization request failed")).toBe(true);
    });

    it("matches expired auth token phrasing", () =>
    {
        expect(isAuthFailure("auth_token expired")).toBe(true);
    });
});

describe("isNoBorrowsToRepay", () =>
{
    it("matches Kamino 6021 numeric code", () =>
    {
        expect(isNoBorrowsToRepay("Simulation failed: {\"InstructionError\":[3,{\"Custom\":6021}]}")).toBe(true);
    });

    it("matches ObligationBorrowsEmpty error name", () =>
    {
        expect(isNoBorrowsToRepay("Error Code: ObligationBorrowsEmpty. Error Number: 6021.")).toBe(true);
    });

    it("matches 'Obligation borrows are empty' message", () =>
    {
        expect(isNoBorrowsToRepay("Program log: Obligation borrows are empty.")).toBe(true);
    });

    it("does not match unrelated errors", () =>
    {
        expect(isNoBorrowsToRepay("InvalidAmount 6003")).toBe(false);
        expect(isNoBorrowsToRepay("PriceTooOld 6039")).toBe(false);
    });
});

describe("isWalletTimeout", () =>
{
    it("matches Android TimeoutException", () =>
    {
        expect(isWalletTimeout("java.util.concurrent.TimeoutException: Timed out waiting for response with id=2")).toBe(true);
    });

    it("matches the bare 'Timed out waiting for response' phrasing", () =>
    {
        expect(isWalletTimeout("Timed out waiting for response with id=7")).toBe(true);
    });

    it("does not match unrelated errors", () =>
    {
        expect(isWalletTimeout("Connection refused")).toBe(false);
        expect(isWalletTimeout("User rejected the request")).toBe(false);
    });
});
