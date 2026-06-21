import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, Text, View } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import type { TokenInfo } from "@/constants/tokens";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";

interface TokenPickerModalProps
{
    visible: boolean;
    tokens: readonly TokenInfo[];
    /** 현재 선택된 토큰의 mint (SOL 은 'native') */
    selectedMint: string;
    onSelect: (token: TokenInfo) => void;
    onClose: () => void;
}

// cbBTC 반대편(카운터) 토큰을 고르는 바텀시트. 기존 토큰 행과 동일한 텍스트(심볼+이름) 스타일.
export function TokenPickerModal({
    visible,
    tokens,
    selectedMint,
    onSelect,
    onClose,
}: TokenPickerModalProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            {/* backdrop/sheet 는 탭 흡수용 — a11y 트리에서 빼서(accessible=false) 콘텐츠가
                버튼 안에 중첩돼 읽히는 것을 막는다. 닫기는 토큰 선택 또는 뒤로가기로. */}
            <Pressable style={styles.backdrop} onPress={onClose} accessible={false}>
                <Pressable style={styles.sheet} onPress={() => undefined} accessible={false} accessibilityViewIsModal>
                    <Text style={styles.title} maxFontSizeMultiplier={1.4}>{t("swap.selectToken")}</Text>
                    {tokens.map((tok) =>
                    {
                        const selected = tok.mint === selectedMint;
                        return (
                            <Pressable
                                key={tok.mint}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                                onPress={() => onSelect(tok)}
                                style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.rowPressed]}
                            >
                                <View style={styles.rowText}>
                                    <Text style={styles.symbol} maxFontSizeMultiplier={1.4}>{tok.symbol}</Text>
                                    <Text style={styles.name} maxFontSizeMultiplier={1.4}>{tok.name}</Text>
                                </View>
                                {selected
                                    ? <Ionicons name="checkmark-circle" size={20} color={palette.primary} />
                                    : null}
                            </Pressable>
                        );
                    })}
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const makeStyles = (t: ThemePalette) => ({
    backdrop: {
        flex: 1,
        backgroundColor: t.overlay,
        justifyContent: "flex-end" as const,
    },
    sheet: {
        backgroundColor: t.surface,
        padding: 20,
        paddingBottom: 36,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: t.borderStrong,
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: "700" as const,
        color: t.text,
        marginBottom: 6,
    },
    row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.background,
    },
    rowSelected: {
        borderColor: t.primary,
        backgroundColor: t.surfaceMuted,
    },
    rowPressed: {
        opacity: 0.7,
    },
    rowText: {
        flexDirection: "row" as const,
        alignItems: "baseline" as const,
        gap: 8,
    },
    symbol: {
        fontSize: 16,
        fontWeight: "700" as const,
        color: t.text,
    },
    name: {
        fontSize: 12,
        color: t.textMuted,
    },
});
