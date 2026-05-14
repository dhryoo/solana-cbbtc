import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HomeScreen } from "@/screens/HomeScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { SwapScreen } from "@/screens/SwapScreen";

type TabKey = "home" | "swap" | "settings";

const TABS: TabKey[] = ["home", "swap", "settings"];

export function AppShell(): React.JSX.Element
{
    const { t } = useTranslation();
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

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#fff",
    },
    content: {
        flex: 1,
    },
    tabbar: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: "#eee",
        backgroundColor: "#fff",
        paddingBottom: 24,
        paddingTop: 8,
    },
    tabItem: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 8,
    },
    tabPressed: {
        opacity: 0.6,
    },
    tabLabel: {
        fontSize: 13,
        color: "#888",
        fontWeight: "500",
    },
    tabLabelActive: {
        color: "#111",
        fontWeight: "700",
    },
});
