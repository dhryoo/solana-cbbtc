import { PublicKey } from "@solana/web3.js";

import { shortenAddress } from "./format";

describe("shortenAddress", () =>
{
    it("returns head…tail when base58 is long", () =>
    {
        const pk = new PublicKey(new Uint8Array(32).fill(7));
        const result = shortenAddress(pk);
        expect(result).toMatch(/^.{4}….{4}$/);
    });

    it("respects custom head/tail lengths", () =>
    {
        const pk = new PublicKey(new Uint8Array(32).fill(9));
        const result = shortenAddress(pk, 6, 6);
        expect(result).toMatch(/^.{6}….{6}$/);
    });
});
