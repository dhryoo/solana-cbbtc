import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    loadNotificationsEnabled,
    saveNotificationsEnabled,
} from "./notificationPreference";

describe("notificationPreference", () =>
{
    beforeEach(async () =>
    {
        await AsyncStorage.clear();
    });

    it("returns false when nothing is stored", async () =>
    {
        expect(await loadNotificationsEnabled()).toBe(false);
    });

    it("round-trips true and false", async () =>
    {
        await saveNotificationsEnabled(true);
        expect(await loadNotificationsEnabled()).toBe(true);

        await saveNotificationsEnabled(false);
        expect(await loadNotificationsEnabled()).toBe(false);
    });

    it("treats unknown stored values as disabled", async () =>
    {
        await AsyncStorage.setItem("settings:notifications:enabled", "yes");
        expect(await loadNotificationsEnabled()).toBe(false);
    });
});
