import React from "react";
import { StatusBar } from "expo-status-bar";

import { ConnectionProvider } from "@/providers/ConnectionProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { WalletProvider } from "@/providers/WalletProvider";
import { AppShell } from "@/screens/AppShell";

export default function App(): React.JSX.Element
{
    return (
        <QueryProvider>
            <ConnectionProvider>
                <WalletProvider>
                    <AppShell />
                    <StatusBar style="auto" />
                </WalletProvider>
            </ConnectionProvider>
        </QueryProvider>
    );
}
