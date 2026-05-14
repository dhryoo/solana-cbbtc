import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";

import type { ThemePalette } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/useThemedStyles";
import { useTheme } from "@/providers/ThemeProvider";

// 공통 상태 표현 컴포넌트.
// 모든 데이터 표시 영역(BalanceCard, QuoteDisplay 등)에서 동일 패턴 사용해 일관성 보장.

interface LoadingViewProps
{
    label?: string;
    size?: "small" | "large";
}

export function LoadingView({ label, size = "small" }: LoadingViewProps): React.JSX.Element
{
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={styles.center}>
            <ActivityIndicator size={size} />
            {label !== undefined && <Text style={styles.label}>{label}</Text>}
        </View>
    );
}

interface ErrorViewProps
{
    message: string;
    onRetry?: () => void;
    retryLabel?: string;
    compact?: boolean;
}

export function ErrorView({ message, onRetry, retryLabel, compact }: ErrorViewProps): React.JSX.Element
{
    const styles = useThemedStyles(makeStyles);
    return (
        <View style={compact ? styles.compactCenter : styles.center}>
            <Text style={styles.errorText}>{message}</Text>
            {onRetry && (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={retryLabel ?? "Retry"}
                    onPress={onRetry}
                    style={({ pressed }) =>
                        [styles.retryButton, pressed && styles.retryPressed]}
                >
                    <Text style={styles.retryText}>{retryLabel ?? "Retry"}</Text>
                </Pressable>
            )}
        </View>
    );
}

interface EmptyViewProps
{
    message: string;
    icon?: keyof typeof Ionicons.glyphMap;
    compact?: boolean;
}

export function EmptyView({ message, icon, compact }: EmptyViewProps): React.JSX.Element
{
    const styles = useThemedStyles(makeStyles);
    const { palette } = useTheme();
    return (
        <View style={compact ? styles.compactCenter : styles.center}>
            {icon && !compact && (
                <Ionicons name={icon} size={36} color={palette.textDim} style={styles.emptyIcon} />
            )}
            <Text style={styles.emptyText}>{message}</Text>
        </View>
    );
}

interface SkeletonBlockProps
{
    width?: number | `${number}%`;
    height?: number;
    borderRadius?: number;
}

// 부드러운 펄스 애니메이션. JS-driven으로 가볍게.
export function SkeletonBlock({
    width = "100%",
    height = 20,
    borderRadius = 6,
}: SkeletonBlockProps): React.JSX.Element
{
    const styles = useThemedStyles(makeStyles);
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() =>
    {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 700,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 700,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () =>
        {
            loop.stop();
        };
    }, [opacity]);

    return (
        <Animated.View
            style={[
                styles.skeleton,
                { width, height, borderRadius, opacity },
            ]}
        />
    );
}

const makeStyles = (t: ThemePalette) => ({
    center: {
        alignItems: "center" as const,
        justifyContent: "center" as const,
        gap: 8,
        paddingVertical: 8,
    },
    compactCenter: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "flex-end" as const,
        gap: 8,
    },
    label: {
        fontSize: 12,
        color: t.textMuted,
    },
    errorText: {
        color: t.error,
        fontSize: 13,
        textAlign: "center" as const,
        maxWidth: 240,
    },
    emptyText: {
        color: t.textMuted,
        fontSize: 13,
        textAlign: "center" as const,
    },
    emptyIcon: {
        marginBottom: 4,
        opacity: 0.6,
    },
    retryButton: {
        marginTop: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.background,
    },
    retryPressed: {
        opacity: 0.7,
    },
    retryText: {
        fontSize: 12,
        color: t.text,
        fontWeight: "600" as const,
    },
    skeleton: {
        backgroundColor: t.surfaceMuted,
    },
});
