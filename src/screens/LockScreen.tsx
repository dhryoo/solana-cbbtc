import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppLock } from "@/providers/AppLockProvider";

// 풀스크린 잠금 오버레이. AppLockProvider 상태가 "locked" 또는 "unlocking"일 때만 표시.
// 마운트 시 자동으로 unlock 시도 — 사용자가 즉시 biometric prompt 받음.
export function LockScreen(): React.JSX.Element | null
{
    const { t } = useTranslation();
    const { state, unlock } = useAppLock();

    useEffect(() =>
    {
        if (state === "locked")
        {
            void unlock();
        }
    }, [state, unlock]);

    if (state !== "locked" && state !== "unlocking")
    {
        return null;
    }

    return (
        <View style={styles.overlay}>
            <View style={styles.iconWrap}>
                <Ionicons name="lock-closed" size={48} color="#ffffff" />
            </View>
            <Text style={styles.title}>{t("lock.title")}</Text>
            <Text style={styles.subtitle}>
                {state === "unlocking" ? t("lock.authenticating") : t("lock.subtitle")}
            </Text>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("lock.unlockAction")}
                onPress={() => { void unlock(); }}
                disabled={state === "unlocking"}
                style={({ pressed }) =>
                    [
                        styles.unlockButton,
                        state === "unlocking" && styles.unlockButtonDisabled,
                        pressed && styles.unlockButtonPressed,
                    ]}
            >
                <Text style={styles.unlockButtonText}>
                    {state === "unlocking" ? t("lock.authenticating") : t("lock.unlockAction")}
                </Text>
            </Pressable>
        </View>
    );
}

// LockScreen은 brand 색상을 직접 사용 (테마 영향 없음). theme prop 불필요.
const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "#9945FF",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        zIndex: 998,
        elevation: 998,
        paddingHorizontal: 32,
    },
    iconWrap: {
        marginBottom: 12,
        opacity: 0.95,
    },
    title: {
        color: "#ffffff",
        fontSize: 22,
        fontWeight: "700",
    },
    subtitle: {
        color: "#EAD8FF",
        fontSize: 14,
        textAlign: "center",
    },
    unlockButton: {
        marginTop: 24,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 24,
        backgroundColor: "#ffffff",
        minWidth: 220,
        alignItems: "center",
    },
    unlockButtonPressed: {
        opacity: 0.85,
    },
    unlockButtonDisabled: {
        opacity: 0.6,
    },
    unlockButtonText: {
        color: "#9945FF",
        fontSize: 15,
        fontWeight: "700",
    },
});
