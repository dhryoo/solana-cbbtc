import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadLightningLabsEnabled, saveLightningLabsEnabled } from "./labsPreference";

beforeEach(async () =>
{
    await AsyncStorage.clear();
});

describe("labsPreference", () =>
{
    it("defaults to false (실험 기능은 명시적 opt-in)", async () =>
    {
        expect(await loadLightningLabsEnabled()).toBe(false);
    });

    it("round-trips true", async () =>
    {
        await saveLightningLabsEnabled(true);
        expect(await loadLightningLabsEnabled()).toBe(true);
    });

    it("round-trips back to false", async () =>
    {
        await saveLightningLabsEnabled(true);
        await saveLightningLabsEnabled(false);
        expect(await loadLightningLabsEnabled()).toBe(false);
    });

    it("returns false on storage corruption", async () =>
    {
        const spy = jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("corrupt"));
        expect(await loadLightningLabsEnabled()).toBe(false);
        spy.mockRestore();
    });
});
