import { parseLightningInput } from "./lightningInvoice";

// BOLT11 스펙 표준 테스트 벡터 (서명 검증은 하지 않으므로 그대로 사용 가능).
// timestamp 1496314658 (2017-06-01), expiry 60s — 항상 만료 상태인 픽스처.
const COFFEE_INVOICE =
    "lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh";

// 금액 없는(amountless) 픽스처 — coffee 벡터의 hrp 에서 금액(2500u)만 제거하고 체크섬 재계산한 것
const AMOUNTLESS_INVOICE =
    "lnbc1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgprj6706";

const COFFEE_TS = 1496314658;

describe("parseLightningInput — bolt11", () =>
{
    it("decodes a standard invoice (amount, description, expiry)", () =>
    {
        const r = parseLightningInput(COFFEE_INVOICE, COFFEE_TS + 10);
        expect(r.kind).toBe("bolt11");
        if (r.kind !== "bolt11") return;
        expect(r.amountSats).toBe(250_000n);          // 2500u BTC
        expect(r.description).toBe("1 cup coffee");
        expect(r.paymentHash).toBe("0001020304050607080900010203040506070809000102030405060708090102");
        expect(r.expiresAt).toBe(COFFEE_TS + 60);
        expect(r.isExpired).toBe(false);              // now = ts+10 < ts+60
    });

    it("marks invoice expired when past expiry", () =>
    {
        const r = parseLightningInput(COFFEE_INVOICE, COFFEE_TS + 61);
        expect(r.kind).toBe("bolt11");
        if (r.kind !== "bolt11") return;
        expect(r.isExpired).toBe(true);
    });

    it("handles amountless invoice with null amount", () =>
    {
        const r = parseLightningInput(AMOUNTLESS_INVOICE, COFFEE_TS + 10);
        expect(r.kind).toBe("bolt11");
        if (r.kind !== "bolt11") return;
        expect(r.amountSats).toBeNull();
    });

    it("strips lightning: URI prefix (QR 관례)", () =>
    {
        const r = parseLightningInput(`lightning:${COFFEE_INVOICE}`, COFFEE_TS + 10);
        expect(r.kind).toBe("bolt11");
    });

    it("accepts ALL-UPPERCASE invoices (QR alphanumeric mode)", () =>
    {
        const r = parseLightningInput(COFFEE_INVOICE.toUpperCase(), COFFEE_TS + 10);
        expect(r.kind).toBe("bolt11");
        if (r.kind !== "bolt11") return;
        expect(r.amountSats).toBe(250_000n);
    });

    it("rejects testnet invoices (mainnet only)", () =>
    {
        // lntb = testnet prefix — 우리 앱은 mainnet 전용
        const testnet = COFFEE_INVOICE.replace(/^lnbc/, "lntb");
        const r = parseLightningInput(testnet, COFFEE_TS + 10);
        expect(r.kind).toBe("invalid");
    });

    it("rejects garbage starting with lnbc", () =>
    {
        expect(parseLightningInput("lnbc_not_a_real_invoice").kind).toBe("invalid");
    });
});

describe("parseLightningInput — lightning address / lnurl", () =>
{
    it("classifies a lightning address", () =>
    {
        const r = parseLightningInput("Jack@strike.me");
        expect(r.kind).toBe("lightningAddress");
        if (r.kind !== "lightningAddress") return;
        expect(r.address).toBe("jack@strike.me"); // 소문자 정규화
    });

    it("rejects email-like strings without TLD", () =>
    {
        expect(parseLightningInput("user@localhost").kind).toBe("invalid");
    });

    it("classifies bech32 lnurl strings", () =>
    {
        const r = parseLightningInput("LNURL1DP68GURN8GHJ7UM9WFMXJCM99E3K7MF0V9CXJ0M385EKVCENXC6R2C35XVUKXEFCV5MKVV34X5EKZD3EV56NYD3HXQURZEPEXEJXXEPNXSCRVWFNV9NXZCN9XQ6XYEFHVGCXXCMYXYMNSERXFQ5FNS");
        expect(r.kind).toBe("lnurl");
        if (r.kind !== "lnurl") return;
        expect(r.lnurl.startsWith("lnurl1")).toBe(true);
    });

    it("rejects empty / whitespace / garbage", () =>
    {
        expect(parseLightningInput("").kind).toBe("invalid");
        expect(parseLightningInput("   ").kind).toBe("invalid");
        expect(parseLightningInput("hello world").kind).toBe("invalid");
        expect(parseLightningInput("bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh").kind).toBe("invalid"); // 온체인 주소는 미지원
    });
});
