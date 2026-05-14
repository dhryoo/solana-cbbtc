import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform, StatusBar, Text, View } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useNetworkStatus } from "@/providers/NetworkProvider";

// 인터넷 연결이 없을 때 화면 최상단에 노출되는 띠.
// AppShell의 첫 자식으로 마운트되어 항상 화면 위에 떠 있음.
// 온라인 상태에서는 아무것도 렌더링하지 않음 (DOM 비용 0).
export function OfflineBanner(): React.JSX.Element | null
{
    const { isOnline } = useNetworkStatus();
    const styles = useThemedStyles(makeStyles);
    const { t } = useTranslation();

    if (isOnline)
    {
        return null;
    }

    return (
        <View
            style={styles.container}
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={`${t("offline.banner")}. ${t("offline.bannerHint")}`}
        >
            <Ionicons name="cloud-offline-outline" size={14} style={styles.icon} />
            <View style={styles.textWrap}>
                <Text style={styles.title}>{t("offline.banner")}</Text>
                <Text style={styles.hint}>{t("offline.bannerHint")}</Text>
            </View>
        </View>
    );
}

const STATUS_BAR_HEIGHT = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

const makeStyles = (t: ThemePalette) => ({
    container: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingTop: STATUS_BAR_HEIGHT + 8,
        paddingBottom: 8,
        paddingHorizontal: 16,
        backgroundColor: t.warn,
    },
    icon: {
        color: t.textInverse,
    },
    textWrap: {
        flex: 1,
    },
    title: {
        color: t.textInverse,
        fontSize: 13,
        fontWeight: "700" as const,
    },
    hint: {
        color: t.textInverse,
        fontSize: 11,
        opacity: 0.9,
    },
});
