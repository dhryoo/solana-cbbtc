import React from "react";
import { StatusBar } from "expo-status-bar";

import { WalletProvider } from "@/providers/WalletProvider";
import { HomeScreen } from "@/screens/HomeScreen";

export default function App(): React.JSX.Element
{
    return (
        <WalletProvider>
            <HomeScreen />
            <StatusBar style="auto" />
        </WalletProvider>
    );
}
