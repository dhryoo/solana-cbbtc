import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import { LN_EXPERIMENTAL_MAX_SATS } from "@/constants/lightning";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { formatSats } from "@/utils/format";

// 실험 기능 소액 상한 안내 — 송금/받기 금액 입력란 아래에 강조된 칩으로 표시.
const MAX_SATS_LABEL = formatSats(LN_EXPERIMENTAL_MAX_SATS);

export function MaxSatsHint(): React.JSX.Element
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={styles.chip}>
            <Ionicons name="flash-outline" size={13} color={BRAND_PURPLE} />
            <Text style={styles.text} maxFontSizeMultiplier={1.4}>
                {t("lightning.maxSatsHint", { max: MAX_SATS_LABEL })}
            </Text>
        </View>
    );
}

const makeStyles = (t: ThemePalette) => ({
    chip: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        alignSelf: "flex-start" as const,
        gap: 5,
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 11,
        borderRadius: 999,
        backgroundColor: t.surfaceMuted,
        borderWidth: 1,
        borderColor: BRAND_PURPLE + "66",
    },
    text: {
        fontSize: 12,
        fontWeight: "700" as const,
        color: BRAND_PURPLE,
    },
});
