import React from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { getClusterId } from "@/constants/cluster";
import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";

// 현재 RPC cluster를 표시하는 작은 배지. 사용자가 mainnet에 있다는 신뢰 신호.
// devnet/testnet 모드라면 다른 색 (경고)으로 표시.
export function NetworkBadge(): React.JSX.Element
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const cluster = getClusterId();

    const label = t(`network.${cluster}`);
    const isMainnet = cluster === "mainnet-beta";

    return (
        <View style={[styles.badge, isMainnet ? styles.mainnet : styles.testnet]}>
            <View style={[styles.dot, isMainnet ? styles.dotMainnet : styles.dotTestnet]} />
            <Text style={[styles.text, !isMainnet && styles.testnetText]}>{label}</Text>
        </View>
    );
}

const makeStyles = (t: ThemePalette) => ({
    badge: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        gap: 6,
    },
    mainnet: {
        backgroundColor: t.surfaceMuted,
        borderColor: t.border,
    },
    testnet: {
        backgroundColor: t.surfaceMuted,
        borderColor: t.warn,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    dotMainnet: {
        backgroundColor: t.success,
    },
    dotTestnet: {
        backgroundColor: t.warn,
    },
    text: {
        fontSize: 11,
        fontWeight: "600" as const,
        color: t.textMuted,
        letterSpacing: 0.3,
    },
    testnetText: {
        color: t.warn,
    },
});
