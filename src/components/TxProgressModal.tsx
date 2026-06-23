import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import { TxProgress } from "@/components/TxProgress";
import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";
import type { ProgressState, TxStep } from "@/utils/txProgress";

interface TxProgressModalProps
{
    progress: { step: TxStep; state: ProgressState } | null;
    /** 모달 제목 (예: "처리 중…") */
    title: string;
    /** 진행 중 멈춘 서명을 사용자가 폐기 (Seeker Seed Vault 는 거부 버튼이 없음) */
    onCancel: () => void;
    cancelLabel: string;
    // TX_STEPS 에 안 맞는 흐름(Lightning cbBTC 멀티페이즈: swap→confirm→sign→pay)은 stepper 대신
    // 이 상태 텍스트(+스피너)를 보여준다. null/미지정이면 progress stepper 를 그린다.
    statusText?: string | null;
}

// 트랜잭션 진행을 화면 중앙 모달로 표시.
// WHY: 기존엔 폼/화면 하단에 인라인으로 떠서 (1) 긴 폼·키보드에 가려 안 보이고 (2) 폭이 좁아 이질적이었다.
// 모달은 항상 중앙·전체 폭으로 보이고 키보드 위를 덮는다. 진행 중(running)일 때만 표시 —
// 성공/실패는 호출 화면의 인라인(결과 카드/안내)이 담당한다. 취소 pill 은 Seed Vault(거부 버튼 없음) 대비 항상 노출.
export function TxProgressModal(
    { progress, title, onCancel, cancelLabel, statusText }: TxProgressModalProps,
): React.JSX.Element
{
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const visible = progress !== null && progress.state === "running";

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
            <View style={styles.backdrop}>
                <View style={styles.sheet} accessibilityViewIsModal>
                    <Text style={styles.title} maxFontSizeMultiplier={1.4}>{title}</Text>
                    {statusText
                        ? (
                            <View style={styles.statusRow}>
                                <ActivityIndicator color={palette.primary} />
                                <Text style={styles.statusText} maxFontSizeMultiplier={1.4}>{statusText}</Text>
                            </View>
                        )
                        : progress
                            ? <TxProgress current={progress.step} state={progress.state} flat />
                            : null}
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={cancelLabel}
                        onPress={onCancel}
                        style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}
                    >
                        <Ionicons name="close-circle-outline" size={16} color={palette.text} />
                        <Text style={styles.cancelText} maxFontSizeMultiplier={1.4}>{cancelLabel}</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const makeStyles = (t: ThemePalette) => ({
    backdrop: {
        flex: 1,
        backgroundColor: t.overlay,
        justifyContent: "center" as const,
        paddingHorizontal: 24,
    },
    sheet: {
        width: "100%" as const,
        backgroundColor: t.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: t.borderStrong,
        padding: 22,
        gap: 18,
    },
    title: {
        fontSize: 17,
        fontWeight: "700" as const,
        color: t.text,
    },
    statusRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
    },
    statusText: {
        flex: 1,
        fontSize: 15,
        fontWeight: "600" as const,
        color: t.text,
    },
    cancel: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 6,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.borderStrong,
        backgroundColor: t.surfaceMuted,
    },
    cancelPressed: { opacity: 0.6 },
    cancelText: { fontSize: 14, fontWeight: "700" as const, color: t.text },
});
