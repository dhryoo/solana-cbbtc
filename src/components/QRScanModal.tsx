/* eslint-disable react-native/no-unused-styles */
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import React, { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Modal, Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";

import { BRAND_PURPLE, type ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";

interface QRScanModalProps
{
    visible: boolean;
    onClose: () => void;
    /** QR 디코드 결과(원문 문자열). 호출자가 parseLightningInput 으로 검증. */
    onScanned: (value: string) => void;
}

// Lightning 인보이스/주소 QR 스캔 (Labs send 화면 전용).
// 카메라는 스캔 동안만 사용 — 사진/영상 저장·전송 없음 (no-backend 정책 일관).
export function QRScanModal({ visible, onClose, onScanned }: QRScanModalProps): React.JSX.Element
{
    const { t } = useTranslation();
    const { palette } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [permission, requestPermission] = useCameraPermissions();
    // 한 번 스캔하면 연속 콜백을 막는다 (onBarcodeScanned 는 프레임마다 발화)
    const handledRef = useRef(false);

    const onBarcode = useCallback((result: { data: string }): void =>
    {
        if (handledRef.current)
        {
            return;
        }
        handledRef.current = true;
        onScanned(result.data.trim());
    }, [onScanned]);

    // 모달이 닫히면 스캔 가드 리셋 — 다음에 열 때 다시 스캔 가능. render 중 ref 변이는
    // React 안티패턴이라 effect 로 옮긴다(닫힘 시점에 1회 실행).
    useEffect(() =>
    {
        if (!visible)
        {
            handledRef.current = false;
        }
    }, [visible]);

    const granted = permission?.granted ?? false;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent={false}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t("qrScan.title")}</Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("common.close")}
                        onPress={onClose}
                        style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.7 }]}
                    >
                        <Ionicons name="close" size={22} color={palette.text} />
                    </Pressable>
                </View>

                {granted ? (
                    <View style={styles.cameraWrap}>
                        {visible && (
                            <CameraView
                                style={StyleSheet.absoluteFill}
                                facing="back"
                                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                                onBarcodeScanned={onBarcode}
                            />
                        )}
                        <View style={styles.reticle} pointerEvents="none" />
                        <Text style={styles.hint}>{t("qrScan.hint")}</Text>
                    </View>
                ) : (
                    <View style={styles.permissionWrap}>
                        <Ionicons name="camera-outline" size={42} color={palette.textDim} />
                        <Text style={styles.permTitle}>{t("qrScan.permTitle")}</Text>
                        <Text style={styles.permBody}>{t("qrScan.permBody")}</Text>
                        {permission?.canAskAgain === false ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => void Linking.openSettings()}
                                style={({ pressed }) => [styles.permButton, pressed && { opacity: 0.7 }]}
                            >
                                <Text style={styles.permButtonText}>{t("qrScan.openSettings")}</Text>
                            </Pressable>
                        ) : (
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => { void requestPermission(); }}
                                style={({ pressed }) => [styles.permButton, pressed && { opacity: 0.7 }]}
                            >
                                <Text style={styles.permButtonText}>{t("qrScan.grant")}</Text>
                            </Pressable>
                        )}
                    </View>
                )}
            </View>
        </Modal>
    );
}

const makeStyles = (t: ThemePalette) => StyleSheet.create({
    container: { flex: 1, backgroundColor: "#000000" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: (Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0) + 12,
        paddingBottom: 12,
        backgroundColor: "#000000",
    },
    title: { fontSize: 17, fontWeight: "700", color: "#ffffff" },
    closeButton: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(255,255,255,0.15)",
    },
    cameraWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
    reticle: {
        width: 240, height: 240,
        borderWidth: 3, borderColor: BRAND_PURPLE, borderRadius: 20,
        backgroundColor: "transparent",
    },
    hint: {
        position: "absolute", bottom: 56,
        color: "#ffffff", fontSize: 14, fontWeight: "600",
        textAlign: "center", paddingHorizontal: 24,
    },
    permissionWrap: {
        flex: 1, alignItems: "center", justifyContent: "center",
        gap: 12, paddingHorizontal: 32, backgroundColor: t.background,
    },
    permTitle: { fontSize: 16, fontWeight: "700", color: t.text, textAlign: "center" },
    permBody: { fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 19 },
    permButton: {
        marginTop: 8, paddingVertical: 12, paddingHorizontal: 24,
        borderRadius: 999, backgroundColor: t.primary,
    },
    permButtonText: { fontSize: 15, fontWeight: "700", color: t.textInverse },
});
