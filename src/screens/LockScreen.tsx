import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppLock } from "@/providers/AppLockProvider";

// 풀스크린 잠금 오버레이. AppLockProvider 상태가 "locked" 또는 "unlocking"일 때만 표시.
//
// 자동 unlock 정책 (v0.1.3 이후):
// - LockScreen 이 처음 "locked" 상태로 mount 될 때 단 1회 자동 biometric prompt 시도
// - 200ms delay 를 둬서 native biometric service 가 안정화된 후 호출 — 너무 빠른 호출은
//   "AuthSession is not current" race 의 트리거였음 (v0.1.1 production logcat 확인)
// - 사용자가 cancel/실패하여 state 가 "locked" 로 돌아와도 자동 재발동 안 함 — 의도한
//   거부 의사를 존중. 사용자는 버튼으로 명시적 재시도 가능
// - AppLockProvider 의 inFlightRef mutex 가 중복 native 호출은 추가로 차단
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
            // RN/native 모듈이 안정화될 시간을 짧게 두고 prompt — 즉시 호출하면
            // expo-local-authentication 이 직전 세션과 충돌하는 케이스가 있음
            const t = setTimeout(() => { void unlock(); }, 200);
            return () => clearTimeout(t);
        }
        return undefined;
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
