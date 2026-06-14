/* eslint-disable react-native/no-unused-styles */
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { TransactionRow } from "@/components/TransactionRow";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useWallet } from "@/hooks/useWallet";
import { useTheme } from "@/providers/ThemeProvider";
import type { TxHistoryItem } from "@/services/TransactionHistoryService";

type FilterKey = "all" | "swap" | "earn" | "lightning";

const EARN_KINDS = new Set(["supply", "withdraw", "borrow", "repay"]);
const LIGHTNING_KINDS = new Set(["lightningPay", "lightningReceive", "lightningRefund"]);

function applyFilter(items: TxHistoryItem[], filter: FilterKey): TxHistoryItem[]
{
    if (filter === "all")
    {
        return items;
    }
    if (filter === "swap")
    {
        return items.filter((i) => i.kind === "swap");
    }
    if (filter === "lightning")
    {
        return items.filter((i) => LIGHTNING_KINDS.has(i.kind));
    }
    return items.filter((i) => EARN_KINDS.has(i.kind));
}

interface HistoryScreenProps
{
    visible: boolean;
    onClose: () => void;
}

export function HistoryScreen({ visible, onClose }: HistoryScreenProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const { account } = useWallet();
    const history = useTransactionHistory({ limit: 50 });
    const [filter, setFilter] = useState<FilterKey>("all");

    const items = useMemo(() =>
    {
        return applyFilter(history.data ?? [], filter);
    }, [history.data, filter]);

    const onRefresh = useCallback(async (): Promise<void> =>
    {
        await history.refetch();
    }, [history]);

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>{t("history.title")}</Text>
                        <Text style={styles.headerSubtitle}>{t("history.subtitle")}</Text>
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("common.close")}
                        onPress={onClose}
                        style={({ pressed }) => [styles.closeButton, pressed && styles.closePressed]}
                    >
                        <Ionicons name="close" size={22} color={palette.text} />
                    </Pressable>
                </View>

                <View style={styles.filters}>
                    <FilterChip label={t("history.filterAll")} active={filter === "all"} onPress={() => setFilter("all")} styles={styles} />
                    <FilterChip label={t("history.filterSwap")} active={filter === "swap"} onPress={() => setFilter("swap")} styles={styles} />
                    <FilterChip label={t("history.filterEarn")} active={filter === "earn"} onPress={() => setFilter("earn")} styles={styles} />
                    <FilterChip label={t("history.filterLightning")} active={filter === "lightning"} onPress={() => setFilter("lightning")} styles={styles} />
                </View>

                {!account ? (
                    <EmptyState icon="wallet-outline" title={t("history.connectFirst")} styles={styles} palette={palette} />
                ) : history.isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color={palette.text} />
                    </View>
                ) : history.isError ? (
                    <EmptyState
                        icon="alert-circle-outline"
                        title={t("history.loadError")}
                        subtitle={history.error?.message ?? undefined}
                        styles={styles}
                        palette={palette}
                    />
                ) : items.length === 0 ? (
                    <EmptyState
                        icon="receipt-outline"
                        title={t("history.empty")}
                        subtitle={t("history.emptyHint")}
                        styles={styles}
                        palette={palette}
                    />
                ) : (
                    <FlatList
                        data={items}
                        keyExtractor={(it) => it.signature}
                        renderItem={({ item }) => <TransactionRow item={item} />}
                        contentContainerStyle={styles.listContent}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        refreshControl={(
                            <RefreshControl
                                refreshing={history.isFetching && !history.isLoading}
                                onRefresh={() => { void onRefresh(); }}
                                tintColor={BRAND_PURPLE}
                                colors={[BRAND_PURPLE]}
                                progressBackgroundColor={palette.surface}
                            />
                        )}
                    />
                )}
            </View>
        </Modal>
    );
}

interface FilterChipProps
{
    label: string;
    active: boolean;
    onPress: () => void;
    styles: ReturnType<typeof makeStyles>;
}

function FilterChip({ label, active, onPress, styles }: FilterChipProps): React.JSX.Element
{
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={onPress}
            style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && styles.chipPressed]}
        >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
        </Pressable>
    );
}

interface EmptyStateProps
{
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    styles: ReturnType<typeof makeStyles>;
    palette: ThemePalette;
}

function EmptyState({ icon, title, subtitle, styles, palette }: EmptyStateProps): React.JSX.Element
{
    return (
        <View style={styles.emptyWrap}>
            <Ionicons name={icon} size={42} color={palette.textDim} />
            <Text style={styles.emptyTitle}>{title}</Text>
            {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
        </View>
    );
}

const makeStyles = (t: ThemePalette) => StyleSheet.create({
    container: { flex: 1, backgroundColor: t.background },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0) + 12,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
        gap: 12,
    },
    headerText: { flex: 1, gap: 2 },
    headerTitle: { fontSize: 18, fontWeight: "700", color: t.text },
    headerSubtitle: { fontSize: 12, color: t.textMuted },
    closeButton: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: "center", justifyContent: "center",
        backgroundColor: t.surfaceMuted,
    },
    closePressed: { opacity: 0.7 },
    filters: {
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
    },
    chipActive: {
        backgroundColor: t.primary,
        borderColor: t.primary,
    },
    chipPressed: { opacity: 0.7 },
    chipText: { fontSize: 13, color: t.text, fontWeight: "500" },
    chipTextActive: { color: t.textInverse, fontWeight: "600" },
    listContent: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4 },
    separator: { height: 8 },
    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyWrap: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: "600",
        color: t.text,
        textAlign: "center",
    },
    emptySubtitle: {
        fontSize: 13,
        color: t.textMuted,
        textAlign: "center",
        lineHeight: 19,
    },
});
