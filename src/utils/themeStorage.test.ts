import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadThemeMode, saveThemeMode } from "./themeStorage";

describe("themeStorage", () =>
{
    beforeEach(async () =>
    {
        await AsyncStorage.clear();
    });

    it("returns null when nothing is stored", async () =>
    {
        expect(await loadThemeMode()).toBeNull();
    });

    it("round-trips system/light/dark", async () =>
    {
        await saveThemeMode("dark");
        expect(await loadThemeMode()).toBe("dark");

        await saveThemeMode("light");
        expect(await loadThemeMode()).toBe("light");

        await saveThemeMode("system");
        expect(await loadThemeMode()).toBe("system");
    });

    it("rejects unknown values stored externally", async () =>
    {
        await AsyncStorage.setItem("settings:themeMode", "neon");
        expect(await loadThemeMode()).toBeNull();
    });
});
