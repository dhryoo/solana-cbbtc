import React from "react";
import { StatusBar } from "expo-status-bar";

import "@/i18n";

import { ConnectionProvider } from "@/providers/ConnectionProvider";
import { I18nProvider } from "@/providers/I18nProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { WalletProvider } from "@/providers/WalletProvider";
import { AppShell } from "@/screens/AppShell";

function ThemedStatusBar(): React.JSX.Element
{
    const { palette } = useTheme();
    // Light 모드면 다크 아이콘, Dark 모드면 라이트 아이콘
    return <StatusBar style={palette.mode === "dark" ? "light" : "dark"} />;
}

export default function App(): React.JSX.Element
{
    return (
        <ThemeProvider>
            <I18nProvider>
                <QueryProvider>
                    <ConnectionProvider>
                        <WalletProvider>
                            <AppShell />
                            <ThemedStatusBar />
                        </WalletProvider>
                    </ConnectionProvider>
                </QueryProvider>
            </I18nProvider>
        </ThemeProvider>
    );
}
