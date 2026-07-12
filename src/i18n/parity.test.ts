import en from "./en.json";
import ko from "./ko.json";
import vi from "./vi.json";
import zh from "./zh.json";

import { SUPPORTED_LANGUAGES } from "./index";

type Tree = { [key: string]: string | Tree };

// 리소스를 "key.path" → 값 으로 평탄화. 키 집합·placeholder 비교의 기준.
function flatten(tree: Tree, prefix = ""): Map<string, string>
{
    const out = new Map<string, string>();
    for (const [key, value] of Object.entries(tree))
    {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === "string")
        {
            out.set(path, value);
        }
        else
        {
            for (const [nestedPath, nestedValue] of flatten(value, path))
            {
                out.set(nestedPath, nestedValue);
            }
        }
    }
    return out;
}

// "{{amount}} sats" → ["{{amount}}"]. i18next 보간자만 추출.
function placeholders(value: string): string[]
{
    return (value.match(/\{\{[^}]+\}\}/g) ?? []).sort();
}

const EN = flatten(en as Tree);

// en 을 기준으로 대조할 나머지 로케일들. 언어를 추가하면 여기에도 한 줄 추가해야 한다.
const OTHERS: Array<[string, Map<string, string>]> = [
    ["ko", flatten(ko as Tree)],
    ["vi", flatten(vi as Tree)],
    ["zh", flatten(zh as Tree)],
];

describe("i18n locale parity", () =>
{
    it("registers exactly the locale files we ship", () =>
    {
        const shipped = ["en", ...OTHERS.map(([lang]) => lang)].sort();
        expect([...SUPPORTED_LANGUAGES].sort()).toEqual(shipped);
    });

    it.each(OTHERS)("%s has exactly the same key set as en", (_lang, translated) =>
    {
        // 어느 쪽이 빠졌는지 바로 보이도록 양방향 diff 를 노출.
        const missing = [...EN.keys()].filter((key) => !translated.has(key));
        const extra = [...translated.keys()].filter((key) => !EN.has(key));

        expect({ missing, extra }).toEqual({ missing: [], extra: [] });
    });

    it.each(OTHERS)("%s preserves every {{placeholder}} from en", (_lang, translated) =>
    {
        const mismatches: string[] = [];
        for (const [key, enValue] of EN)
        {
            const value = translated.get(key);
            if (value === undefined)
            {
                continue; // 키 누락은 위 테스트가 잡는다
            }
            const expected = placeholders(enValue);
            const actual = placeholders(value);
            if (expected.join("|") !== actual.join("|"))
            {
                mismatches.push(`${key}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
            }
        }
        expect(mismatches).toEqual([]);
    });

    it.each(OTHERS)("%s has no blank translation where en is non-empty", (_lang, translated) =>
    {
        const blanks: string[] = [];
        for (const [key, enValue] of EN)
        {
            const value = translated.get(key);
            if (enValue.trim() !== "" && value !== undefined && value.trim() === "")
            {
                blanks.push(key);
            }
        }
        expect(blanks).toEqual([]);
    });

    // 자산 심볼과 프로토콜 이름은 번역되면 사용자가 자기 잔액을 못 알아본다.
    // lock.promptUnlock 은 예외 — ko 가 의도적으로 앱 이름을 빼고 "앱 잠금 해제"로 줄여 쓴다.
    const ASSET_TOKENS = ["cbBTC", "USDC", "Jupiter", "Kamino", "Solscan"];
    const BRAND_EXEMPT = new Set(["lock.promptUnlock"]);

    it.each(OTHERS)("%s leaves asset/protocol names untranslated", (_lang, translated) =>
    {
        const mismatches: string[] = [];
        for (const [key, enValue] of EN)
        {
            const value = translated.get(key);
            if (value === undefined || BRAND_EXEMPT.has(key))
            {
                continue;
            }
            for (const token of ASSET_TOKENS)
            {
                if (enValue.includes(token) && !value.includes(token))
                {
                    mismatches.push(`${key}: "${token}" missing`);
                }
            }
        }
        expect(mismatches).toEqual([]);
    });
});
