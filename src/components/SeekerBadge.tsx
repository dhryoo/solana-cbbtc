import React from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useSeekerIdentity } from "@/hooks/useSeekerIdentity";

// 표시 규칙:
// - hasGenesisToken=true → "Seeker Verified ✓" (강한 신호, primary 강조)
// - 그 외 isSeekerDevice=true → "Seeker device" (소프트 hint, muted)
// - 둘 다 false → 아무것도 렌더 안 함 (null)
export function SeekerBadge(): React.JSX.Element | null
{
    const { t } = useTranslation();
    const { hasGenesisToken, isSeekerDevice, isLoading } = useSeekerIdentity();
    const styles = useThemedStyles(makeStyles);

    if (isLoading)
    {
        return null;
    }

    if (hasGenesisToken)
    {
        return (
            <View style={[styles.badge, styles.verified]}>
                <Text style={styles.verifiedText}>✓ {t("seeker.verified")}</Text>
            </View>
        );
    }

    if (isSeekerDevice)
    {
        return (
            <View style={[styles.badge, styles.softHint]}>
                <Text style={styles.softHintText}>{t("seeker.device")}</Text>
            </View>
        );
    }

    return null;
}

const makeStyles = (t: ThemePalette) => ({
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: "center" as const,
    },
    verified: {
        backgroundColor: "#9945FF", // 브랜드 보라 — 강한 강조
    },
    verifiedText: {
        color: "#ffffff",
        fontSize: 12,
        fontWeight: "700" as const,
        letterSpacing: 0.3,
    },
    softHint: {
        backgroundColor: t.surfaceMuted,
        borderWidth: 1,
        borderColor: t.border,
    },
    softHintText: {
        color: t.textMuted,
        fontSize: 11,
        fontWeight: "500" as const,
    },
});
