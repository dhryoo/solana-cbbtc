import React from "react";
import { StatusBar } from "expo-status-bar";

import { ConnectionProvider } from "@/providers/ConnectionProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { WalletProvider } from "@/providers/WalletProvider";
import { HomeScreen } from "@/screens/HomeScreen";

export default function App(): React.JSX.Element
{
    return (
        <QueryProvider>
            <ConnectionProvider>
                <WalletProvider>
                    <HomeScreen />
                    <StatusBar style="auto" />
                </WalletProvider>
            </ConnectionProvider>
        </QueryProvider>
    );
}
