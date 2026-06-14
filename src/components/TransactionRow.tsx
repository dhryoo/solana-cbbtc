import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, Text, View } from "react-native";

import { CBBTC, SOL, USDC } from "@/constants/tokens";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";
import type { TxHistoryItem, TxHistoryKind } from "@/services/TransactionHistoryService";
import { formatRawAmount } from "@/utils/format";
import { relativeTime } from "@/utils/relativeTime";

interface TransactionRowProps
{
    item: TxHistoryItem;
}

// kind 에 따른 아이콘 + 색.
function kindVisual(kind: TxHistoryKind, palette: ThemePalette): { icon: keyof typeof Ionicons.glyphMap; color: string }
{
    switch (kind)
    {
        case "swap":
            return { icon: "swap-horizontal", color: palette.primary };
        case "supply":
            return { icon: "arrow-down-circle-outline", color: palette.success };
        case "withdraw":
            return { icon: "arrow-up-circle-outline", color: palette.warn };
        case "borrow":
            return { icon: "trending-up-outline", color: palette.warn };
        case "repay":
            return { icon: "checkmark-done-outline", color: palette.success };
        case "lightningPay":
            return { icon: "flash", color: BRAND_PURPLE };
        case "lightningReceive":
            return { icon: "flash-outline", color: palette.success };
        case "lightningRefund":
            return { icon: "arrow-undo-circle-outline", color: palette.warn };
        default:
            return { icon: "ellipse-outline", color: palette.textMuted };
    }
}

interface AmountDescriptor
{
    primary: string;            // "0.001 cbBTC" 같은 표시 문자열
    direction: string | null;   // swap 의 경우 "cbBTC → SOL" 식
}

export function describeAmount(
    item: TxHistoryItem,
    t: (key: string) => string,
): AmountDescriptor
{
    const cb = item.cbbtcDelta;
    const ud = item.usdcDelta;
    const absOf = (v: bigint): bigint => (v < 0n ? -v : v);

    if (item.kind === "swap")
    {
        if (cb !== undefined && cb !== 0n)
        {
            const direction = cb < 0n ? t("history.directions.swapOutCbbtc") : t("history.directions.swapInCbbtc");
            return {
                primary: `${formatRawAmount(absOf(cb).toString(), CBBTC.decimals)} ${CBBTC.symbol}`,
                direction,
            };
        }
        return { primary: t("history.directions.swapGeneric"), direction: null };
    }
    if (item.kind === "supply" || item.kind === "withdraw")
    {
        if (cb !== undefined)
        {
            return {
                primary: `${formatRawAmount(absOf(cb).toString(), CBBTC.decimals)} ${CBBTC.symbol}`,
                direction: null,
            };
        }
    }
    if (item.kind === "borrow" || item.kind === "repay")
    {
        if (ud !== undefined)
        {
            return {
                primary: `${formatRawAmount(absOf(ud).toString(), USDC.decimals)} ${USDC.symbol}`,
                direction: null,
            };
        }
    }
    if (item.kind === "lightningPay" || item.kind === "lightningReceive" || item.kind === "lightningRefund")
    {
        // 발신 자산: USDC 우선, 없으면 native SOL (lamports, fee 포함 근사)
        if (ud !== undefined && ud !== 0n)
        {
            return {
                primary: `${formatRawAmount(absOf(ud).toString(), USDC.decimals)} ${USDC.symbol}`,
                direction: null,
            };
        }
        const sol = item.solDelta;
        if (sol !== undefined && sol !== 0n)
        {
            return {
                primary: `${formatRawAmount(absOf(sol).toString(), SOL.decimals)} ${SOL.symbol}`,
                direction: null,
            };
        }
    }
    return { primary: "—", direction: null };
}

export function TransactionRow({ item }: TransactionRowProps): React.JSX.Element
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();

    const visual = useMemo(() => kindVisual(item.kind, palette), [item.kind, palette]);
    const amount = useMemo(() => describeAmount(item, t), [item, t]);
    const time = useMemo(() =>
    {
        if (!item.blockTime)
        {
            return "—";
        }
        const rel = relativeTime(item.blockTime * 1000);
        return t(rel.key, rel.params);
    }, [item.blockTime, t]);

    const onPress = (): void =>
    {
        void Linking.openURL(`https://solscan.io/tx/${item.signature}`);
    };

    const kindLabel = t(`history.kinds.${item.kind}`);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${kindLabel} ${amount.primary}`}
            onPress={onPress}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
            <View style={[styles.iconWrap, { backgroundColor: palette.surfaceMuted }]}>
                <Ionicons name={visual.icon} size={20} color={visual.color} />
            </View>
            <View style={styles.body}>
                <View style={styles.titleRow}>
                    <Text style={styles.title}>{kindLabel}</Text>
                    {!item.success && (
                        <Text style={styles.failed}>· {t("history.failed")}</Text>
                    )}
                </View>
                <Text style={styles.subtitle}>
                    {amount.direction ? `${amount.direction} · ${amount.primary}` : amount.primary}
                </Text>
            </View>
            <View style={styles.meta}>
                <Text style={styles.time}>{time}</Text>
                <Ionicons name="open-outline" size={14} color={palette.textDim} />
            </View>
        </Pressable>
    );
}

const makeStyles = (t: ThemePalette) => ({
    row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
    },
    rowPressed: { opacity: 0.7 },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center" as const,
        justifyContent: "center" as const,
    },
    body: { flex: 1, gap: 2 },
    titleRow: {
        flexDirection: "row" as const,
        alignItems: "baseline" as const,
        gap: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: "600" as const,
        color: t.text,
    },
    failed: {
        fontSize: 12,
        color: t.error,
        fontWeight: "600" as const,
    },
    subtitle: {
        fontSize: 13,
        color: t.textMuted,
    },
    meta: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
    },
    time: {
        fontSize: 12,
        color: t.textDim,
    },
});
