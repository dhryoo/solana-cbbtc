import * as Localization from "expo-localization";

import { detectSystemLanguage } from "./index";

const mockedLocalization = Localization as jest.Mocked<typeof Localization>;

describe("detectSystemLanguage", () =>
{
    afterEach(() =>
    {
        jest.clearAllMocks();
    });

    it("returns 'ko' when system primary locale is Korean", () =>
    {
        mockedLocalization.getLocales.mockReturnValue([
            { languageCode: "ko", languageTag: "ko-KR", regionCode: "KR" } as never,
            { languageCode: "en", languageTag: "en-US", regionCode: "US" } as never,
        ]);
        expect(detectSystemLanguage()).toBe("ko");
    });

    it("returns 'en' when system primary locale is English", () =>
    {
        mockedLocalization.getLocales.mockReturnValue([
            { languageCode: "en", languageTag: "en-US", regionCode: "US" } as never,
        ]);
        expect(detectSystemLanguage()).toBe("en");
    });

    it("falls back to 'en' for unsupported locales (e.g., Japanese)", () =>
    {
        mockedLocalization.getLocales.mockReturnValue([
            { languageCode: "ja", languageTag: "ja-JP", regionCode: "JP" } as never,
        ]);
        expect(detectSystemLanguage()).toBe("en");
    });

    it("walks the locale priority list and picks first supported", () =>
    {
        // 예: 일본어 → 독일어 → 한국어 → 영어 순으로 설정된 디바이스
        mockedLocalization.getLocales.mockReturnValue([
            { languageCode: "ja", languageTag: "ja-JP" } as never,
            { languageCode: "de", languageTag: "de-DE" } as never,
            { languageCode: "ko", languageTag: "ko-KR" } as never,
            { languageCode: "en", languageTag: "en-US" } as never,
        ]);
        expect(detectSystemLanguage()).toBe("ko");
    });

    it("falls back to 'en' when getLocales throws", () =>
    {
        mockedLocalization.getLocales.mockImplementation(() =>
        {
            throw new Error("native module not available");
        });
        expect(detectSystemLanguage()).toBe("en");
    });

    it("falls back to 'en' when getLocales returns empty", () =>
    {
        mockedLocalization.getLocales.mockReturnValue([]);
        expect(detectSystemLanguage()).toBe("en");
    });
});
