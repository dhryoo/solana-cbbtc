import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

import appConfig from "../../app.json";

import { RELEASES_REPO_NAME, RELEASES_REPO_OWNER } from "@/constants/app";
import { useNetworkStatus } from "@/providers/NetworkProvider";
import {
    fetchLatestRelease,
    loadIgnoredVersion,
    saveIgnoredVersion,
    shouldShowBanner,
    type LatestRelease,
} from "@/services/UpdateCheckService";

export interface UpdateCheckResult
{
    /** 현재 설치된 버전 — app.json 의 expo.version */
    currentVersion: string;
    /** GitHub 최신 release. 없거나 fetch 실패 시 null */
    latest: LatestRelease | null;
    /** 사용자에게 알림 배너를 표시할지 */
    shouldShow: boolean;
    /** "이 버전 무시" — latest 버전을 AsyncStorage 에 저장. 그보다 더 새 버전이 나올 때까지 안 보임 */
    ignoreLatest: () => Promise<void>;
}

const QUERY_KEY = ["update-check"] as const;

/**
 * GitHub Releases 기반 버전 알림.
 *
 * 정책:
 * - 오프라인이면 fetch 안 함 (배너 안 뜸)
 * - staleTime 1 시간 — GitHub 무인증 API rate limit(60 req/h/IP) 보호
 * - retry 0 — 실패 시 조용히 (사용자에 노이즈 X). 다음 stale 만료 때 다시 시도
 * - "이 버전 무시" 정보는 AsyncStorage 에 저장. 컴포넌트 mount 시 비동기 로드
 */
export function useUpdateCheck(): UpdateCheckResult
{
    const { isOnline } = useNetworkStatus();
    const currentVersion = appConfig.expo.version;

    // 비동기 AsyncStorage 결과를 React state 로 가져와 동기 계산 가능하게.
    const [ignored, setIgnored] = useState<string | null>(null);
    const [ignoredLoaded, setIgnoredLoaded] = useState(false);

    useEffect(() =>
    {
        let mounted = true;
        void loadIgnoredVersion().then((v) =>
        {
            if (mounted)
            {
                setIgnored(v);
                setIgnoredLoaded(true);
            }
        });
        return () => { mounted = false; };
    }, []);

    const query = useQuery<LatestRelease | null, Error>({
        queryKey: QUERY_KEY,
        enabled: isOnline,
        staleTime: 60 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        retry: 0,
        refetchOnWindowFocus: false,
        queryFn: () => fetchLatestRelease(RELEASES_REPO_OWNER, RELEASES_REPO_NAME),
    });

    const latest = query.data ?? null;
    const shouldShow = ignoredLoaded && shouldShowBanner(currentVersion, latest?.tag ?? null, ignored);

    const ignoreLatest = useCallback(async (): Promise<void> =>
    {
        if (!latest)
        {
            return;
        }
        await saveIgnoredVersion(latest.tag);
        setIgnored(latest.tag);
    }, [latest]);

    return {
        currentVersion,
        latest,
        shouldShow,
        ignoreLatest,
    };
}
