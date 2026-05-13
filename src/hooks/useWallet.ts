import { useContext } from "react";

import { WalletContext, WalletContextValue } from "@/providers/WalletProvider";

export function useWallet(): WalletContextValue
{
    const ctx = useContext(WalletContext);
    if (!ctx)
    {
        throw new Error("useWallet must be used within WalletProvider");
    }
    return ctx;
}
