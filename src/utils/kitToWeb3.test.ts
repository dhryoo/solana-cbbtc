import { PublicKey } from "@solana/web3.js";

import { isSigner, isWritable, kitInstructionToWeb3, type KitInstruction } from "./kitToWeb3";

// @solana/kit AccountRole: READONLY=0, WRITABLE=1, READONLY_SIGNER=2, WRITABLE_SIGNER=3
describe("isSigner / isWritable", () =>
{
    it("isSigner: 2,3 만 true", () =>
    {
        expect(isSigner(0)).toBe(false);
        expect(isSigner(1)).toBe(false);
        expect(isSigner(2)).toBe(true);
        expect(isSigner(3)).toBe(true);
    });

    it("isWritable: 1,3 만 true", () =>
    {
        expect(isWritable(0)).toBe(false);
        expect(isWritable(1)).toBe(true);
        expect(isWritable(2)).toBe(false);
        expect(isWritable(3)).toBe(true);
    });
});

describe("kitInstructionToWeb3", () =>
{
    const PROGRAM = "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD";
    const A = "So11111111111111111111111111111111111111112";
    const B = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    it("programAddress / keys(role 변환) / data 를 v1 으로 변환", () =>
    {
        const kitIx: KitInstruction = {
            programAddress: PROGRAM,
            accounts: [
                { address: A, role: 3 }, // writable signer
                { address: B, role: 0 }, // readonly
            ],
            data: new Uint8Array([1, 2, 3]),
        };
        const ix = kitInstructionToWeb3(kitIx);

        expect(ix.programId.toBase58()).toBe(PROGRAM);
        expect(ix.keys).toHaveLength(2);
        expect(ix.keys[0]).toEqual({
            pubkey: new PublicKey(A),
            isSigner: true,
            isWritable: true,
        });
        expect(ix.keys[1]).toEqual({
            pubkey: new PublicKey(B),
            isSigner: false,
            isWritable: false,
        });
        expect([...ix.data]).toEqual([1, 2, 3]);
    });

    it("accounts / data 가 없어도 처리", () =>
    {
        const ix = kitInstructionToWeb3({ programAddress: PROGRAM });
        expect(ix.keys).toEqual([]);
        expect(ix.data).toHaveLength(0);
    });
});
