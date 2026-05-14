import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadAppLockEnabled, saveAppLockEnabled } from "./appLockPreference";

describe("appLockPreference", () =>
{
    beforeEach(async () =>
    {
        await AsyncStorage.clear();
    });

    it("returns false when nothing stored", async () =>
    {
        expect(await loadAppLockEnabled()).toBe(false);
    });

    it("round-trips true and false", async () =>
    {
        await saveAppLockEnabled(true);
        expect(await loadAppLockEnabled()).toBe(true);

        await saveAppLockEnabled(false);
        expect(await loadAppLockEnabled()).toBe(false);
    });

    it("treats unknown stored values as disabled", async () =>
    {
        await AsyncStorage.setItem("settings:appLock:enabled", "maybe");
        expect(await loadAppLockEnabled()).toBe(false);
    });
});
