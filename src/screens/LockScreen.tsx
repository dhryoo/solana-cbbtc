import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { BRAND_PURPLE } from "@/constants/theme";
import { useAppLock } from "@/providers/AppLockProvider";

// 풀스크린 잠금 오버레이.
//
// 네이티브 Modal 로 감싼다: Android 에서 RN Modal 은 액티비티 뷰 계층 위에 별도 Dialog
// 윈도우로 그려진다. LockScreen 이 평범한 absolute View(zIndex) 였을 땐 History/SwapConfirm
// 등 다른 네이티브 Modal 이 그 위에 떠서 잠금 상태에서도 민감 내용(잔액·주소·서명 액션)이
// 노출될 수 있었다(R19). 잠금 시점에 새로 mount 되는 Modal 은 나중에 추가된 윈도우라 기존
// Modal 위에 스택된다. onRequestClose(뒤로가기)는 no-op 으로 잠금을 못 닫게 한다.
//
// UX (v0.1.7 이후):
//   화면 전체가 Pressable. 사용자가 어디든 탭하면 unlock() 호출 → biometric prompt 표시.
//   자동 prompt 발동은 의도적으로 하지 않는다 — 앱 mount / wallet auto-reconnect / MWA
//   intent 등이 동시에 일어나면서 native biometric service 가 background 가 된 앱의 prompt
//   요청을 silent-ignore 하는 race 가 production 에서 재현되었기 때문 (v0.1.0~v0.1.6 시도
//   전부 실패 → logcat 분석 결과).
//
//   사용자 명시 액션 후의 unlock() 은 항상 정상 동작이 확인됨 (LockScreen 의 unlock 버튼
//   path 는 v0.1.2 부터 안정적).
export function LockScreen(): React.JSX.Element | null
{
    const { t } = useTranslation();
    const { state, unlock } = useAppLock();

    if (state !== "locked" && state !== "unlocking")
    {
        return null;
    }

    const isAuthenticating = state === "unlocking";

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            // 잠금 화면은 Android 뒤로가기로 닫히면 안 된다 — no-op 로 잠금 유지.
            onRequestClose={() => { /* keep locked */ }}
        >
            <Pressable
                style={styles.overlay}
                accessibilityRole="button"
                accessibilityLabel={t("lock.unlockAction")}
                accessibilityHint={t("lock.tapHint")}
                onPress={() => { void unlock(); }}
            >
                <View style={styles.iconWrap}>
                    <Ionicons
                        name="finger-print"
                        size={88}
                        color="#ffffff"
                    />
                </View>
                <Text style={styles.title}>{t("lock.title")}</Text>
                <Text style={styles.subtitle}>
                    {isAuthenticating ? t("lock.authenticating") : t("lock.tapToUnlock")}
                </Text>
                {!isAuthenticating && (
                    <View style={styles.hintWrap}>
                        <Ionicons name="hand-left-outline" size={14} color="#EAD8FF" />
                        <Text style={styles.hint}>{t("lock.subtitle")}</Text>
                    </View>
                )}
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: BRAND_PURPLE,
        alignItems: "center",
        justifyContent: "center",
        gap: 18,
        zIndex: 998,
        elevation: 998,
        paddingHorizontal: 32,
    },
    iconWrap: {
        marginBottom: 16,
        opacity: 0.95,
    },
    title: {
        color: "#ffffff",
        fontSize: 24,
        fontWeight: "700",
    },
    subtitle: {
        color: "#ffffff",
        fontSize: 16,
        fontWeight: "600",
        textAlign: "center",
        marginTop: 4,
    },
    hintWrap: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 12,
        opacity: 0.85,
    },
    hint: {
        color: "#EAD8FF",
        fontSize: 13,
        textAlign: "center",
    },
});
