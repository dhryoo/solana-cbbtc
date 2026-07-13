import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Platform, Pressable, StatusBar, Text } from "react-native";

import { UpdateDetailModal } from "@/components/UpdateDetailModal";
import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { hapticSelection } from "@/services/HapticsService";

export function UpdateBanner(): React.JSX.Element | null
{
    const { t } = useTranslation();
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();
    const update = useUpdateCheck();
    const { isOnline } = useNetworkStatus();
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
            style={({ pressed }) =>
                [
                    styles.row,
                    // 오프라인 배너가 위에 있으면 그쪽이 이미 status bar 영역을 먹었다 → 중복 패딩 금지.
                    !isOnline && styles.rowBelowOfflineBanner,
                    pressed && styles.rowPressed,
                ]}
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

// 앱은 edge-to-edge(edgeToEdgeEnabled)로 그려지므로 화면 최상단 컴포넌트가 직접
// status bar 높이를 흡수해야 한다. 안 하면 시계/배터리 영역 아래로 배너가 파고든다.
// 모듈 로드 시점이 아니라 렌더 시점에 읽는다 — currentHeight 는 native 초기화 후에 채워진다.
function statusBarInset(): number
{
    return Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
}

const makeStyles = (t: ThemePalette) => ({
    row: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        paddingTop: statusBarInset() + 8,
        paddingBottom: 8,
        paddingHorizontal: 14,
        backgroundColor: t.surfaceMuted,
        borderBottomWidth: 1,
        borderBottomColor: t.border,
    },
    rowBelowOfflineBanner: { paddingTop: 8 },
    rowPressed: { opacity: 0.7 },
    text: {
        flex: 1,
        fontSize: 13,
        fontWeight: "600" as const,
        color: t.text,
    },
});
