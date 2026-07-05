import AsyncStorage from "@react-native-async-storage/async-storage";

import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

// GitHub Releases API 기반 버전 알림 서비스.
// no-backend 정책 준수 — 우리가 운영하는 서버 없이 GitHub 의 퍼블릭 API 만 호출.
// 인증 없음 → 60 req/hour/IP rate limit. 사용자가 앱 켤 때 1 회 + staleTime 1h 면 충분.

export interface LatestRelease
{
    tag: string;            // e.g. "v0.2.3"
    name: string;
    body: string;           // release notes markdown
    htmlUrl: string;        // GitHub release 페이지 URL
    publishedAt: string;    // ISO 8601
}

// --- semver ---

export interface SemverParts { major: number; minor: number; patch: number }

/** "v0.2.3" / "0.2.3" / "0.2.3-rc1" → { major, minor, patch }. 잘못된 입력은 null. */
export function parseSemver(input: string): SemverParts | null
{
    if (typeof input !== "string" || input.length === 0)
    {
        return null;
    }
    const stripped = input.replace(/^v/i, "").split(/[-+]/)[0] ?? "";
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(stripped);
    if (!match)
    {
        return null;
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3]),
    };
}

/**
 * 두 버전을 비교. -1: a<b, 0: a===b, 1: a>b.
 * 입력이 잘못된 경우 안전을 위해 0 반환 (배너 안 띄움).
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1
{
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    if (!pa || !pb)
    {
        return 0;
    }
    if (pa.major !== pb.major) return pa.major > pb.major ? 1 : -1;
    if (pa.minor !== pb.minor) return pa.minor > pb.minor ? 1 : -1;
    if (pa.patch !== pb.patch) return pa.patch > pb.patch ? 1 : -1;
    return 0;
}

// --- AsyncStorage: 사용자가 "이 버전 무시" 한 버전 ---

const IGNORED_VERSION_KEY = "settings:update:ignoredVersion";

export async function loadIgnoredVersion(): Promise<string | null>
{
    try
    {
        return await AsyncStorage.getItem(IGNORED_VERSION_KEY);
    }
    catch
    {
        return null;
    }
}

export async function saveIgnoredVersion(version: string | null): Promise<void>
{
    try
    {
        if (version === null)
        {
            await AsyncStorage.removeItem(IGNORED_VERSION_KEY);
        }
        else
        {
            await AsyncStorage.setItem(IGNORED_VERSION_KEY, version);
        }
    }
    catch
    {
        // 저장 실패는 silently 무시 — 다음 세션에 다시 보이는 정도의 비용
    }
}

// --- GitHub Releases API ---

interface GitHubReleaseRaw
{
    tag_name?: unknown;
    name?: unknown;
    body?: unknown;
    html_url?: unknown;
    published_at?: unknown;
    prerelease?: unknown;
    draft?: unknown;
}

/**
 * GitHub 의 `/releases/latest` 호출. prerelease/draft 는 GitHub 가 자동 제외.
 * 어떤 종류 실패든(rate limit / 네트워크 / 404) null 반환 — 사용자에게 노이즈 안 줌.
 */
export async function fetchLatestRelease(
    owner: string,
    repo: string,
): Promise<LatestRelease | null>
{
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    try
    {
        const res = await fetchWithTimeout(url, {
            headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok)
        {
            return null;
        }
        const raw = (await res.json()) as GitHubReleaseRaw;
        if (typeof raw.tag_name !== "string")
        {
            return null;
        }
        return {
            tag: raw.tag_name,
            name: typeof raw.name === "string" && raw.name.length > 0 ? raw.name : raw.tag_name,
            body: typeof raw.body === "string" ? raw.body : "",
            htmlUrl: typeof raw.html_url === "string" ? raw.html_url : "",
            publishedAt: typeof raw.published_at === "string" ? raw.published_at : "",
        };
    }
    catch
    {
        return null;
    }
}

// --- 상위 결정 ---

/**
 * 사용자에게 배너를 보일지 여부 결정.
 * - latest 없음 / current === latest / latest <= current → false
 * - 사용자가 "이 버전 무시" 한 버전 ≥ latest → false
 * - 그 외 → true
 */
export function shouldShowBanner(
    currentVersion: string,
    latestTag: string | null,
    ignoredVersion: string | null,
): boolean
{
    if (!latestTag) return false;
    if (compareSemver(latestTag, currentVersion) !== 1) return false;
    if (ignoredVersion && compareSemver(latestTag, ignoredVersion) !== 1) return false;
    return true;
}
