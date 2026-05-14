import React from "react";
import { StatusBar } from "expo-status-bar";

import "@/i18n";

import { ConnectionProvider } from "@/providers/ConnectionProvider";
import { I18nProvider } from "@/providers/I18nProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { WalletProvider } from "@/providers/WalletProvider";
import { AppShell } from "@/screens/AppShell";

export default function App(): React.JSX.Element
{
    return (
        <I18nProvider>
            <QueryProvider>
                <ConnectionProvider>
                    <WalletProvider>
                        <AppShell />
                        <StatusBar style="auto" />
                    </WalletProvider>
                </ConnectionProvider>
            </QueryProvider>
        </I18nProvider>
    );
}
