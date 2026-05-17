import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAppLock } from "@/providers/AppLockProvider";

// 풀스크린 잠금 오버레이. AppLockProvider 상태가 "locked" 또는 "unlocking"일 때만 표시.
//
// 자동 unlock 정책 (v0.1.4 이후):
// - LockScreen 이 mount 되는 시점 = state ∈ {locked, unlocking} 이라는 의미
// - mount 한 번에 unlock() 1회 호출. state 의존 안 함 — state 가 mount 직전·직후로
//   변할 수 있어 effect 가 발동 안 되거나 dependency 변경 cleanup 으로 timer 가
//   취소되는 케이스를 차단 (v0.1.3 에서 일부 디바이스의 이슈)
// - autoTriedRef 가 같은 mount 동안 중복 호출 방지. LockScreen 이 unmount 되었다가
//   (= state 가 unlocked → 다시 locked) remount 되면 ref 가 새로 초기화되므로 다시 자동 시도
// - 사용자가 cancel/실패한 경우엔 LockScreen 이 unmount 되지 않으므로 자동 재시도 안 됨
//   (의도한 거부 의사 존중) — 명시적 버튼으로만 재시도
// - AppLockProvider 의 inFlightRef mutex 가 중복 native 호출은 추가로 차단
export function LockScreen(): React.JSX.Element | null
{
    const { t } = useTranslation();
    const { state, unlock } = useAppLock();
    const autoTriedRef = useRef(false);

    useEffect(() =>
    {
        if (autoTriedRef.current)
        {
            return;
        }
        autoTriedRef.current = true;
        void unlock();
    }, [unlock]);

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
