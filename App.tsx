import React from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import "@/i18n";

import { SplashOverlay } from "@/components/SplashOverlay";
import { ConnectionProvider } from "@/providers/ConnectionProvider";
import { I18nProvider } from "@/providers/I18nProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { WalletProvider } from "@/providers/WalletProvider";
import { AppShell } from "@/screens/AppShell";

// Native splash auto-hide 방지 — React가 mount해서 SplashOverlay를 띄울 때까지 유지.
// 실제 hide는 SplashOverlay.tsx의 useEffect에서 호출.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

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
                        <NotificationProvider>
                            <WalletProvider>
                                <AppShell />
                                <ThemedStatusBar />
                                <SplashOverlay />
                            </WalletProvider>
                        </NotificationProvider>
                    </ConnectionProvider>
                </QueryProvider>
            </I18nProvider>
        </ThemeProvider>
    );
}
