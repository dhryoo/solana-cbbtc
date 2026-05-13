import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { HomeScreen } from "@/screens/HomeScreen";
import { SwapScreen } from "@/screens/SwapScreen";

type TabKey = "home" | "swap";

interface TabSpec
{
    key: TabKey;
    label: string;
}

const TABS: TabSpec[] = [
    { key: "home", label: "자산" },
    { key: "swap", label: "Swap" },
];

export function AppShell(): React.JSX.Element
{
    const [tab, setTab] = useState<TabKey>("home");

    return (
        <View style={styles.root}>
            <View style={styles.content}>
                {tab === "home" && <HomeScreen />}
                {tab === "swap" && <SwapScreen />}
            </View>

            <View style={styles.tabbar}>
                {TABS.map((spec) => (
                    <Pressable
                        key={spec.key}
                        accessibilityRole="tab"
                        accessibilityLabel={spec.label}
                        accessibilityState={{ selected: tab === spec.key }}
                        onPress={() => setTab(spec.key)}
                        style={({ pressed }) =>
                            [
                                styles.tabItem,
                                pressed && styles.tabPressed,
                            ]}
                    >
                        <Text
                            style={[
                                styles.tabLabel,
                                tab === spec.key && styles.tabLabelActive,
                            ]}
                        >
                            {spec.label}
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
