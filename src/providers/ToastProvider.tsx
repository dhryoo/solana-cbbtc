import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

export type ToastVariant = "info" | "success" | "error";

interface ToastState
{
    id: number;
    message: string;
    variant: ToastVariant;
    durationMs: number;
}

interface ToastContextValue
{
    showToast: (message: string, options?: { variant?: ToastVariant; durationMs?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps
{
    children: React.ReactNode;
}

// 단순 단일 큐 toast — 한 번에 하나만 표시, 새 toast가 오면 즉시 교체.
// 위치: 화면 하단 (탭 바 위). pointerEvents=none이라 인터랙션 방해 없음.
export function ToastProvider({ children }: ToastProviderProps): React.JSX.Element
{
    const [toast, setToast] = useState<ToastState | null>(null);
    const idRef = useRef(0);
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    const showToast = useCallback((
        message: string,
        options?: { variant?: ToastVariant; durationMs?: number },
    ): void =>
    {
        idRef.current += 1;
        setToast({
            id: idRef.current,
            message,
            variant: options?.variant ?? "info",
            durationMs: options?.durationMs ?? 2200,
        });
    }, []);

    useEffect(() =>
    {
        if (!toast) return undefined;

        Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
            Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
        ]).start();

        const timer = setTimeout(() =>
        {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 20, duration: 180, useNativeDriver: true }),
            ]).start(({ finished }) =>
            {
                if (finished)
                {
                    setToast((current) => current?.id === toast.id ? null : current);
                }
            });
        }, toast.durationMs);

        return () =>
        {
            clearTimeout(timer);
        };
    }, [toast, opacity, translateY]);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && <ToastView toast={toast} opacity={opacity} translateY={translateY} />}
        </ToastContext.Provider>
    );
}

interface ToastViewProps
{
    toast: ToastState;
    opacity: Animated.Value;
    translateY: Animated.Value;
}

function ToastView({ toast, opacity, translateY }: ToastViewProps): React.JSX.Element
{
    const { palette } = useTheme();

    const bg =
        toast.variant === "success" ? palette.success
            : toast.variant === "error" ? palette.error
                : palette.text;
    const fg = palette.background;

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.container,
                {
                    backgroundColor: bg,
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Text style={[styles.text, { color: fg }]}>{toast.message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: 100,
        left: 32,
        right: 32,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        alignItems: "center",
        elevation: 8,
        zIndex: 1000,
    },
    text: {
        fontSize: 14,
        fontWeight: "600",
    },
});

export function useToast(): ToastContextValue
{
    const ctx = useContext(ToastContext);
    if (!ctx)
    {
        throw new Error("useToast must be used within ToastProvider");
    }
    return ctx;
}
