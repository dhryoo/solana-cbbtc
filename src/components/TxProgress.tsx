import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Animated, Text, View } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";
import {
    TX_STEPS,
    stepProgressRatio,
    stepVisual,
    type ProgressState,
    type TxStep,
} from "@/utils/txProgress";

interface TxProgressProps
{
    current: TxStep;
    state: ProgressState;
    // 결과 카드 안에 임베드할 때: 자체 박스(테두리·배경) 없이 평평하게.
    flat?: boolean;
}

// 트랜잭션 진행 stepper (supply/borrow/repay/withdraw 공용).
// 진행 막대 width 는 실제 단계 비율에 애니메이션 연동 (가짜 타이머 아님).
export function TxProgress({ current, state, flat = false }: TxProgressProps): React.JSX.Element
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();

    const fill = useRef(new Animated.Value(0)).current;
    const target = state === "success" ? 1 : stepProgressRatio(current);

    useEffect(() =>
    {
        Animated.timing(fill, {
            toValue: target,
            duration: 280,
            useNativeDriver: false,
        }).start();
    }, [target, fill]);

    const barColor = state === "error" ? palette.warn : palette.primary;
    const widthPct = fill.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

    return (
        <View style={flat ? styles.wrapFlat : styles.wrap}>
            <View style={styles.bar}>
                <Animated.View style={[styles.barFill, { width: widthPct, backgroundColor: barColor }]} />
            </View>

            <View style={styles.steps}>
                {TX_STEPS.map((s) =>
                {
                    const v = stepVisual(s, current, state);
                    return (
                        <View key={s} style={styles.row}>
                            <View style={styles.iconBox}>
                                {v === "active"
                                    ? <ActivityIndicator size="small" color={palette.primary} />
                                    : v === "done"
                                        ? <Ionicons name="checkmark-circle" size={22} color={palette.success} />
                                        : v === "error"
                                            ? <Ionicons name="close-circle" size={22} color={palette.warn} />
                                            : <Ionicons name="ellipse-outline" size={20} color={palette.textDim} />}
                            </View>
                            <Text
                                style={[
                                    styles.label,
                                    v === "pending" && styles.labelPending,
                                    (v === "active" || v === "error") && styles.labelStrong,
                                ]}
                            >
                                {t(`txProgress.${s}`)}
                            </Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const makeStyles = (t: ThemePalette) => ({
    wrap: {
        marginTop: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surfaceMuted,
    },
    wrapFlat: {
        // 결과 카드 임베드용 — 박스 없이 평평하게.
        paddingTop: 2,
        paddingBottom: 2,
    },
    bar: {
        height: 4,
        borderRadius: 2,
        backgroundColor: t.border,
        overflow: "hidden" as const,
        marginBottom: 14,
    },
    barFill: {
        height: 4,
        borderRadius: 2,
    },
    steps: {
        gap: 8,
    },
    row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
    },
    iconBox: {
        width: 24,
        height: 24,
        alignItems: "center" as const,
        justifyContent: "center" as const,
    },
    label: {
        fontSize: 14,
        color: t.text,
    },
    labelPending: {
        color: t.textDim,
    },
    labelStrong: {
        fontWeight: "700" as const,
    },
});
