import { pickEarnNoticeHintKey } from "./earnNoticeHint";
import {
    isInsufficientFunds,
    isInsufficientLamports,
    isNoBorrowsToRepay,
    isOracleStaleError,
    isWalletTimeout,
} from "./lendingErrors";

// 대표 실패 문자열 (실제 시뮬레이션/MWA 메시지 형태)
const ORACLE = 'Simulation failed: {"InstructionError":[3,{"Custom":6039}]}'; // PriceTooOld
const WALLET_TIMEOUT = "java.util.concurrent.TimeoutException: Timed out waiting for response with id=5";
const NO_BORROWS = 'Simulation failed: {"InstructionError":[3,{"Custom":6021}]}'; // ObligationBorrowsEmpty
const LAMPORTS = "Transfer: insufficient lamports 0, need 2039280"; // SOL(가스/rent) 부족 — System Program
// repay 전액 상환 실패: USDC 부족 — SPL Token program "insufficient funds"(lamports 아님).
const TOKEN_FUNDS = 'Simulation failed: {"InstructionError":[3,{"Custom":1}]}\n--- logs ---\n'
    + "Program log: Instruction: RepayObligationLiquidity\n"
    + "Program log: Error: insufficient funds\n"
    + "Program TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA failed: custom program error: 0x1";
// 사용자가 보고한 암호 같은 SOL 부족 — System Program ResultWithNegativeLamports. 어떤 술어에도 안 걸린다.
const CRYPTIC_SOL = 'Simulation failed: {"InstructionError":[3,{"Custom":1}]}';

const base = { authFailed: false, solGasLow: false, cancelled: false };

describe("pickEarnNoticeHintKey", () =>
{
    it("maps oracle-stale first (even if SOL is also low)", () =>
    {
        expect(pickEarnNoticeHintKey({ ...base, message: ORACLE })).toBe("earn.oracleStaleHint");
        expect(pickEarnNoticeHintKey({ ...base, message: ORACLE, solGasLow: true })).toBe("earn.oracleStaleHint");
    });

    it("maps auth failure before the SOL fallback (regression guard)", () =>
    {
        // 저잔액 사용자가 인증 실패를 봐도 'SOL 부족'이 아니라 'authFailedHint' 가 떠야 한다.
        expect(pickEarnNoticeHintKey({ ...base, message: "x", authFailed: true, solGasLow: true })).toBe("earn.authFailedHint");
    });

    it("maps wallet timeout before the SOL fallback", () =>
    {
        expect(pickEarnNoticeHintKey({ ...base, message: WALLET_TIMEOUT, solGasLow: true })).toBe("earn.walletTimeoutHint");
    });

    it("maps no-borrows-to-repay", () =>
    {
        expect(pickEarnNoticeHintKey({ ...base, message: NO_BORROWS })).toBe("earn.noBorrowsHint");
    });

    it("maps confirm_timeout to the confirmation hint (even if SOL is low)", () =>
    {
        expect(pickEarnNoticeHintKey({ ...base, message: "confirm_timeout" })).toBe("earn.confirmTimeoutHint");
        expect(pickEarnNoticeHintKey({ ...base, message: "confirm_timeout", solGasLow: true })).toBe("earn.confirmTimeoutHint");
    });

    it("maps on-chain failure to the tx-failed hint", () =>
    {
        const ONCHAIN = 'transaction failed on-chain: {"InstructionError":[0,"Custom"]}';
        expect(pickEarnNoticeHintKey({ ...base, message: ONCHAIN })).toBe("earn.txFailedHint");
    });

    it("maps insufficient-LAMPORTS (SOL) text to the SOL hint", () =>
    {
        expect(pickEarnNoticeHintKey({ ...base, message: LAMPORTS })).toBe("earn.insufficientHint");
    });

    it("does NOT map a token-only 'insufficient funds' (repay USDC short) to the SOL hint", () =>
    {
        // Token program 의 insufficient funds 는 SOL 이 아니라 USDC 부족 — 폼이 따로 처리한다.
        expect(pickEarnNoticeHintKey({ ...base, message: TOKEN_FUNDS })).toBeNull();
    });

    it("maps the cryptic Custom:1 SOL shortage when solGasLow and NOT cancelled", () =>
    {
        expect(pickEarnNoticeHintKey({ ...base, message: CRYPTIC_SOL, solGasLow: true })).toBe("earn.insufficientHint");
    });

    it("shows nothing (null) when the user cancelled, even if SOL is low", () =>
    {
        expect(pickEarnNoticeHintKey({ ...base, message: CRYPTIC_SOL, solGasLow: true, cancelled: true })).toBeNull();
    });

    it("returns null for an unrecognized error when SOL is not low", () =>
    {
        expect(pickEarnNoticeHintKey({ ...base, message: CRYPTIC_SOL, solGasLow: false })).toBeNull();
        expect(pickEarnNoticeHintKey({ ...base, message: "totally unknown error", solGasLow: false })).toBeNull();
    });
});

describe("SOL vs token shortfall split", () =>
{
    it("isInsufficientLamports matches SOL shortfalls but NOT token (SPL) ones", () =>
    {
        expect(isInsufficientLamports(LAMPORTS)).toBe(true);
        expect(isInsufficientLamports(TOKEN_FUNDS)).toBe(false);
    });

    it("isInsufficientFunds (broad) still matches BOTH", () =>
    {
        expect(isInsufficientFunds(LAMPORTS)).toBe(true);
        expect(isInsufficientFunds(TOKEN_FUNDS)).toBe(true);
    });
});

describe("ladder safety: message predicates are pairwise-disjoint over representative strings", () =>
{
    // ladder 의 재정렬이 안전하려면 한 메시지가 둘 이상 술어에 동시에 매칭되면 안 된다.
    // 미래에 정규식/술어가 추가돼 이 불변식이 깨지면 이 테스트가 먼저 실패한다.
    const predicates = [
        ["oracle", isOracleStaleError] as const,
        ["walletTimeout", isWalletTimeout] as const,
        ["noBorrows", isNoBorrowsToRepay] as const,
        ["lamports", isInsufficientLamports] as const,
    ];

    const fixtures: Array<[string, string]> = [
        ["oracle", ORACLE],
        ["walletTimeout", WALLET_TIMEOUT],
        ["noBorrows", NO_BORROWS],
        ["lamports", LAMPORTS],
    ];

    it.each(fixtures)("%s string matches exactly one ladder predicate", (expectedKey, message) =>
    {
        const matched = predicates.filter(([, p]) => p(message)).map(([name]) => name);
        expect(matched).toEqual([expectedKey]);
    });

    it("the cryptic Custom:1 SOL shortage matches NO message predicate (relies on solGasLow)", () =>
    {
        const matched = predicates.filter(([, p]) => p(CRYPTIC_SOL)).map(([name]) => name);
        expect(matched).toEqual([]);
    });
});
