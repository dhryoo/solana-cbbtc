import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadLanguagePreference, saveLanguagePreference } from "./languageStorage";

describe("languageStorage", () =>
{
    beforeEach(async () =>
    {
        await AsyncStorage.clear();
    });

    it("returns null when nothing is stored", async () =>
    {
        const result = await loadLanguagePreference();
        expect(result).toBeNull();
    });

    it("round-trips a saved language", async () =>
    {
        await saveLanguagePreference("en");
        const result = await loadLanguagePreference();
        expect(result).toBe("en");
    });

    it("ignores unsupported language stored externally", async () =>
    {
        await AsyncStorage.setItem("settings:language", "fr");
        const result = await loadLanguagePreference();
        expect(result).toBeNull();
    });
});
