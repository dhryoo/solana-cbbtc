import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, View } from "react-native";

import { TxProgress } from "@/components/TxProgress";
import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";
import type { ProgressState, TxStep } from "@/utils/txProgress";

interface CancelableProgressProps
{
    progress: { step: TxStep; state: ProgressState } | null;
    /** 진행 중 멈춘 서명을 사용자가 폐기 (Seeker Seed Vault 는 거부 버튼이 없음) */
    onCancel: () => void;
    cancelLabel: string;
}

// TxProgress + 항상 보이는 '취소' pill. 진행 표시가 떠 있는 동안(상태 무관) 취소를 노출 —
// Seeker Seed Vault 는 거부 버튼이 없고 X 로 닫으면 서명이 멈추므로, 이게 기본 복구 수단이다.
export function CancelableProgress({ progress, onCancel, cancelLabel }: CancelableProgressProps): React.JSX.Element | null
{
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);

    if (!progress)
    {
        return null;
    }
    return (
        <View style={styles.wrap}>
            <TxProgress current={progress.step} state={progress.state} />
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
                onPress={onCancel}
                style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
            >
                <Ionicons name="close-circle-outline" size={16} color={palette.text} />
                <Text style={styles.cancelText}>{cancelLabel}</Text>
            </Pressable>
        </View>
    );
}

const makeStyles = (t: ThemePalette) => ({
    wrap: { gap: 12, alignItems: "center" as const },
    cancel: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 6,
        alignSelf: "center" as const,
        paddingVertical: 11,
        paddingHorizontal: 22,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: t.borderStrong,
        backgroundColor: t.surfaceMuted,
        minWidth: 140,
    },
    cancelPressed: { opacity: 0.6 },
    cancelText: { fontSize: 14, fontWeight: "700" as const, color: t.text },
});
