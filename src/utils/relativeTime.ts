// 단순 relative time 포맷. date-fns/dayjs 의존 회피.
// i18n key 반환 → 호출자가 t()로 번역 + count interpolation.

export interface RelativeTime
{
    key: string;
    params?: Record<string, number>;
}

export function relativeTime(timestamp: number | undefined | null, now: number = Date.now()): RelativeTime
{
    if (!timestamp)
    {
        return { key: "relative.never" };
    }
    const diffMs = Math.max(0, now - timestamp);
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 5)
    {
        return { key: "relative.justNow" };
    }
    if (diffSec < 60)
    {
        return { key: "relative.secondsAgo", params: { count: diffSec } };
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)
    {
        return { key: "relative.minutesAgo", params: { count: diffMin } };
    }
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24)
    {
        return { key: "relative.hoursAgo", params: { count: diffHour } };
    }
    const diffDay = Math.floor(diffHour / 24);
    return { key: "relative.daysAgo", params: { count: diffDay } };
}

// stale 판정: threshold 초보다 오래되면 true
export function isStale(timestamp: number | undefined | null, thresholdSec: number, now: number = Date.now()): boolean
{
    if (!timestamp)
    {
        return true;
    }
    return (now - timestamp) / 1000 >= thresholdSec;
}
