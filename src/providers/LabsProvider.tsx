import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { loadLightningLabsEnabled, saveLightningLabsEnabled } from "@/utils/labsPreference";

// 실험실(Labs) 기능 상태. 기본 모두 OFF — 기존 사용자 경험에 영향 없음.
// 토글이 OFF 인 동안 실험 기능 컴포넌트는 마운트되지 않는다 (조건부 렌더).

export interface LabsContextValue
{
    /** Lightning 결제 (Phase 3 실험) 노출 여부 */
    lightningEnabled: boolean;
    setLightningEnabled: (next: boolean) => Promise<void>;
}

const LabsContext = createContext<LabsContextValue | null>(null);

export function LabsProvider({ children }: { children: React.ReactNode }): React.JSX.Element
{
    const [lightningEnabled, setLightningState] = useState(false);

    useEffect(() =>
    {
        let mounted = true;
        void loadLightningLabsEnabled().then((v) =>
        {
            if (mounted && v)
            {
                setLightningState(true);
            }
        });
        return () => { mounted = false; };
    }, []);

    const setLightningEnabled = useCallback(async (next: boolean): Promise<void> =>
    {
        setLightningState(next);
        await saveLightningLabsEnabled(next);
    }, []);

    const value = useMemo<LabsContextValue>(
        () => ({ lightningEnabled, setLightningEnabled }),
        [lightningEnabled, setLightningEnabled],
    );

    return <LabsContext.Provider value={value}>{children}</LabsContext.Provider>;
}

export function useLabs(): LabsContextValue
{
    const ctx = useContext(LabsContext);
    if (!ctx)
    {
        throw new Error("useLabs must be used within LabsProvider");
    }
    return ctx;
}
