import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppLock } from "@/providers/AppLockProvider";

// 풀스크린 잠금 오버레이. AppLockProvider 상태가 "locked" 또는 "unlocking"일 때만 표시.
//
// 자동 unlock 정책 (v0.1.2 이후):
// - mount 시 단 1회만 자동 biometric prompt 시도
// - 실패하거나 cancelled 되어 state 가 다시 "locked" 로 떨어져도 자동으로 재발동하지 않음
// - 이전 버전에서는 state 변화마다 unlock 재호출 → 빠른 재진입으로 native biometric service
//   가 "AuthSession is not current" race 에 빠지는 버그(stuck "Authenticating…") 의 원인
// - 사용자가 LockScreen 버튼으로 명시적으로 재시도 가능
export function LockScreen(): React.JSX.Element | null
{
    const { t } = useTranslation();
    const { state, unlock } = useAppLock();
    const autoTriedRef = useRef(false);

    useEffect(() =>
    {
        if (state === "locked" && !autoTriedRef.current)
        {
            autoTriedRef.current = true;
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
                // 'unlocking' 중에도 누를 수 있어야 stuck 상황에서 사용자가 force-retry 가능.
                // AppLockProvider 의 inFlightRef 가 중복 native 호출은 알아서 차단.
                style={({ pressed }) =>
                    [
                        styles.unlockButton,
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
    unlockButtonText: {
        color: "#9945FF",
        fontSize: 15,
        fontWeight: "700",
    },
});
