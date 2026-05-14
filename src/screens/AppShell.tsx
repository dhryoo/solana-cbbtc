import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { HomeScreen } from "@/screens/HomeScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { SwapScreen } from "@/screens/SwapScreen";

type TabKey = "home" | "swap" | "settings";

const TABS: TabKey[] = ["home", "swap", "settings"];

export function AppShell(): React.JSX.Element
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const [tab, setTab] = useState<TabKey>("home");

    return (
        <View style={styles.root}>
            <View style={styles.content}>
                {tab === "home" && <HomeScreen />}
                {tab === "swap" && <SwapScreen />}
                {tab === "settings" && <SettingsScreen />}
            </View>

            <View style={styles.tabbar}>
                {TABS.map((key) => (
                    <Pressable
                        key={key}
                        accessibilityRole="tab"
                        accessibilityLabel={t(`tabs.${key}`)}
                        accessibilityState={{ selected: tab === key }}
                        onPress={() => setTab(key)}
                        style={({ pressed }) =>
                            [
                                styles.tabItem,
                                pressed && styles.tabPressed,
                            ]}
                    >
                        <Text
                            style={[
                                styles.tabLabel,
                                tab === key && styles.tabLabelActive,
                            ]}
                        >
                            {t(`tabs.${key}`)}
                        </Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const makeStyles = (t: ThemePalette) => ({
    root: {
        flex: 1,
        backgroundColor: t.background,
    },
    content: {
        flex: 1,
    },
    tabbar: {
        flexDirection: "row" as const,
        borderTopWidth: 1,
        borderTopColor: t.border,
        backgroundColor: t.background,
        paddingBottom: 24,
        paddingTop: 8,
    },
    tabItem: {
        flex: 1,
        alignItems: "center" as const,
        paddingVertical: 8,
    },
    tabPressed: {
        opacity: 0.6,
    },
    tabLabel: {
        fontSize: 13,
        color: t.textMuted,
        fontWeight: "500" as const,
    },
    tabLabelActive: {
        color: t.text,
        fontWeight: "700" as const,
    },
});
