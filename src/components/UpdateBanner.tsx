import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text } from "react-native";

import { UpdateDetailModal } from "@/components/UpdateDetailModal";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import { useTheme } from "@/providers/ThemeProvider";
import { hapticSelection } from "@/services/HapticsService";

export function UpdateBanner(): React.JSX.Element | null
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();
    const update = useUpdateCheck();
    const [modalOpen, setModalOpen] = useState(false);

    if (!update.shouldShow || !update.latest)
    {
        return null;
    }

    const onPress = (): void =>
    {
        void hapticSelection();
        setModalOpen(true);
    };

    const label = t("update.bannerTitle", { version: update.latest.tag });

    return (
        <>
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={onPress}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        >
            <Ionicons name="arrow-up-circle" size={18} color={BRAND_PURPLE} />
            <Text style={styles.text} numberOfLines={1}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={palette.textMuted} />
        </Pressable>
        <UpdateDetailModal
            visible={modalOpen}
            onClose={() => setModalOpen(false)}
            update={update}
        />
        </>
    );
}

const makeStyles = (t: ThemePalette) => ({
    row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: t.surfaceMuted,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
    },
    rowPressed: { opacity: 0.7 },
    text: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600" as const,
        color: t.text,
    },
});
