import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Pressable, Text, View } from "react-native";

import { OfflineBanner } from "@/components/OfflineBanner";
import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { HomeScreen } from "@/screens/HomeScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { SwapScreen } from "@/screens/SwapScreen";
import { hapticSelection } from "@/services/HapticsService";

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

    const handleSelect = (next: TabKey): void =>
    {
        if (next === tab) return;
        void hapticSelection();
        setTab(next);
    };

    return (
        <View style={styles.root}>
            <OfflineBanner />
            <View style={styles.content}>
                <TabContent activeKey={tab} />
            </View>

            <View style={styles.tabbar}>
                {TABS.map((key) => (
                    <TabButton
                        key={key}
                        tabKey={key}
                        label={t(`tabs.${key}`)}
                        active={tab === key}
                        onPress={() => handleSelect(key)}
                    />
                ))}
            </View>
        </View>
    );
}

// 탭 전환 시 부드러운 cross-fade. Animated.Value를 활용하되 React state도 동기화해
// 비활성 탭은 unmount하여 메모리/RPC 비용 절감.
function TabContent({ activeKey }: { activeKey: TabKey }): React.JSX.Element
{
    const opacity = useRef(new Animated.Value(1)).current;
    const [renderedKey, setRenderedKey] = useState<TabKey>(activeKey);

    useEffect(() =>
    {
        if (activeKey === renderedKey)
        {
            return;
        }
        Animated.timing(opacity, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
        }).start(({ finished }) =>
        {
            if (!finished) return;
            setRenderedKey(activeKey);
            Animated.timing(opacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }).start();
        });
    }, [activeKey, renderedKey, opacity]);

    return (
        <Animated.View style={{ flex: 1, opacity }}>
            {renderedKey === "home" && <HomeScreen />}
            {renderedKey === "swap" && <SwapScreen />}
            {renderedKey === "settings" && <SettingsScreen />}
        </Animated.View>
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
