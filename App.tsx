import React from "react";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import "@/i18n";

import { SplashOverlay } from "@/components/SplashOverlay";
import { AppLockProvider } from "@/providers/AppLockProvider";
import { ConnectionProvider } from "@/providers/ConnectionProvider";
import { I18nProvider } from "@/providers/I18nProvider";
import { NetworkProvider } from "@/providers/NetworkProvider";
import { NotificationProvider } from "@/providers/NotificationProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { ToastProvider } from "@/providers/ToastProvider";
import { WalletProvider } from "@/providers/WalletProvider";
import { LockScreen } from "@/screens/LockScreen";
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
                <ToastProvider>
                    <NetworkProvider>
                        <QueryProvider>
                            <ConnectionProvider>
                                <NotificationProvider>
                                    {/*
                                     * AppLockProvider 가 WalletProvider 부모 — wallet 자동
                                     * reconnect 가 잠금 해제 이전에 일어나면 MWA intent 로
                                     * 앱이 background 로 전환되어 biometric prompt 가 silent
                                     * fail 함. WalletProvider 가 useAppLock 으로 unlocked
                                     * 상태가 될 때까지 reconnect 를 미룬다.
                                     */}
                                    <AppLockProvider>
                                        <WalletProvider>
                                            <AppShell />
                                            <ThemedStatusBar />
                                            <SplashOverlay />
                                        </WalletProvider>
                                        <LockScreen />
                                    </AppLockProvider>
                                </NotificationProvider>
                            </ConnectionProvider>
                        </QueryProvider>
                    </NetworkProvider>
                </ToastProvider>
            </I18nProvider>
        </ThemeProvider>
    );
}
