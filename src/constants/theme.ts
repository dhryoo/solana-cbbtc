// Semantic color tokens. 컴포넌트는 raw hex가 아닌 의미 토큰을 참조.
// 토큰 추가 시 두 모드 모두 정의 — light/dark 누락 방지.

export interface ThemePalette
{
    mode: "light" | "dark";

    background: string;       // 화면 기본 배경
    surface: string;          // 카드 배경
    surfaceMuted: string;     // 더 흐린 배경 (입력 영역 등)
    overlay: string;          // 모달 backdrop

    text: string;
    textMuted: string;        // 보조 텍스트
    textDim: string;          // 더 흐린 (placeholder 등)
    textInverse: string;      // primary 배경 위 텍스트

    primary: string;          // 강조 색 (버튼, 활성 상태)
    primaryPressed: string;
    disabled: string;

    border: string;
    borderStrong: string;

    error: string;
    success: string;
    warn: string;
}

export const LIGHT_PALETTE: ThemePalette = {
    mode: "light",
    background: "#ffffff",
    surface: "#fafafa",
    surfaceMuted: "#f3f3f3",
    overlay: "rgba(0,0,0,0.5)",
    text: "#111111",
    textMuted: "#666666",
    textDim: "#bbbbbb",
    textInverse: "#ffffff",
    primary: "#111111",
    primaryPressed: "#2a2a2a",
    disabled: "#dddddd",
    border: "#eeeeee",
    borderStrong: "#cccccc",
    error: "#cc3333",
    success: "#2e8b57",
    warn: "#aa5555",
};

export const DARK_PALETTE: ThemePalette = {
    mode: "dark",
    background: "#0e0e10",
    surface: "#1a1a1d",
    surfaceMuted: "#222226",
    overlay: "rgba(0,0,0,0.6)",
    text: "#f5f5f5",
    textMuted: "#999999",
    textDim: "#555555",
    textInverse: "#0e0e10",
    primary: "#ffffff",
    primaryPressed: "#dddddd",
    disabled: "#333338",
    border: "#2a2a2e",
    borderStrong: "#44444a",
    error: "#ff6b6b",
    success: "#4ecdc4",
    warn: "#d6a85a",
};

export type ThemeMode = "system" | "light" | "dark";

export function paletteFor(mode: "light" | "dark"): ThemePalette
{
    return mode === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
}
