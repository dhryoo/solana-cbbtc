import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { HomeScreen } from "@/screens/HomeScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { SwapScreen } from "@/screens/SwapScreen";

type TabKey = "home" | "swap" | "settings";

interface TabIconSpec
{
    inactive: keyof typeof Ionicons.glyphMap;
    active: keyof typeof Ionicons.glyphMap;
}

const TAB_ICONS: Record<TabKey, TabIconSpec> = {
    home: { inactive: "wallet-outline", active: "wallet" },
    swap: { inactive: "swap-horizontal-outline", active: "swap-horizontal" },
    settings: { inactive: "settings-outline", active: "settings" },
};

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
                    <TabButton
                        key={key}
                        tabKey={key}
                        label={t(`tabs.${key}`)}
                        active={tab === key}
                        onPress={() => setTab(key)}
                    />
                ))}
            </View>
        </View>
    );
}

interface TabButtonProps
{
    tabKey: TabKey;
    label: string;
    active: boolean;
    onPress: () => void;
}

function TabButton({ tabKey, label, active, onPress }: TabButtonProps): React.JSX.Element
{
    const styles = useThemedStyles(makeStyles);
    const iconName = active ? TAB_ICONS[tabKey].active : TAB_ICONS[tabKey].inactive;
    return (
        <Pressable
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={onPress}
            style={({ pressed }) =>
                [
                    styles.tabItem,
                    pressed && styles.tabPressed,
                ]}
        >
            <Ionicons
                name={iconName}
                size={22}
                style={active ? styles.tabIconActive : styles.tabIcon}
            />
            <Text
                style={[
                    styles.tabLabel,
                    active && styles.tabLabelActive,
                ]}
            >
                {label}
            </Text>
        </Pressable>
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
        paddingVertical: 6,
        gap: 2,
    },
    tabPressed: {
        opacity: 0.6,
    },
    tabIcon: {
        color: t.textMuted,
    },
    tabIconActive: {
        color: t.text,
    },
    tabLabel: {
        fontSize: 11,
        color: t.textMuted,
        fontWeight: "500" as const,
    },
    tabLabelActive: {
        color: t.text,
        fontWeight: "700" as const,
    },
});
