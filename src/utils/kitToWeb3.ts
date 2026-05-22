import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

// @solana/kit(웹3 v2) Instruction 을 web3.js v1 TransactionInstruction 으로 변환.
// Kamino codegen instruction builder 는 kit Instruction 을 반환하지만, 우리 앱은
// v1 + MWA(Seed Vault) 서명을 쓰므로 v1 으로 내려야 한다.
//
// kit AccountRole enum: READONLY=0, WRITABLE=1, READONLY_SIGNER=2, WRITABLE_SIGNER=3.

interface KitAccountMeta
{
    address: string;
    role: number;
}

export interface KitInstruction
{
    programAddress: string;
    accounts?: readonly KitAccountMeta[];
    data?: Uint8Array;
}

export function isSigner(role: number): boolean
{
    return role === 2 || role === 3;
}

export function isWritable(role: number): boolean
{
    return role === 1 || role === 3;
}

export function kitInstructionToWeb3(ix: KitInstruction): TransactionInstruction
{
    return new TransactionInstruction({
        programId: new PublicKey(ix.programAddress),
        keys: (ix.accounts ?? []).map((a) => ({
            pubkey: new PublicKey(a.address),
            isSigner: isSigner(a.role),
            isWritable: isWritable(a.role),
        })),
        data: Buffer.from(ix.data ?? new Uint8Array()),
    });
}
