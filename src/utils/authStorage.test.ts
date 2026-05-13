import AsyncStorage from "@react-native-async-storage/async-storage";

import { clearAuthToken, loadAuthToken, saveAuthToken } from "./authStorage";

jest.mock("@react-native-async-storage/async-storage", () =>
    ({
        __esModule: true,
        default: {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
        },
    }));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("authStorage", () =>
{
    beforeEach(() =>
    {
        mockAsyncStorage.getItem.mockReset();
        mockAsyncStorage.setItem.mockReset();
        mockAsyncStorage.removeItem.mockReset();
    });

    describe("saveAuthToken", () =>
    {
        it("writes token to AsyncStorage under the wallet key", async () =>
        {
            mockAsyncStorage.setItem.mockResolvedValue(undefined);

            await saveAuthToken("token-abc");

            expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1);
            const [key, value] = mockAsyncStorage.setItem.mock.calls[0] ?? [];
            expect(key).toMatch(/wallet/i);
            expect(value).toBe("token-abc");
        });
    });

    describe("loadAuthToken", () =>
    {
        it("returns the stored token", async () =>
        {
            mockAsyncStorage.getItem.mockResolvedValue("token-abc");

            const token = await loadAuthToken();

            expect(token).toBe("token-abc");
        });

        it("returns null when storage is empty", async () =>
        {
            mockAsyncStorage.getItem.mockResolvedValue(null);

            const token = await loadAuthToken();

            expect(token).toBeNull();
        });

        it("returns null when AsyncStorage throws", async () =>
        {
            mockAsyncStorage.getItem.mockRejectedValue(new Error("storage corrupt"));

            const token = await loadAuthToken();

            expect(token).toBeNull();
        });
    });

    describe("clearAuthToken", () =>
    {
        it("removes the stored token", async () =>
        {
            mockAsyncStorage.removeItem.mockResolvedValue(undefined);

            await clearAuthToken();

            expect(mockAsyncStorage.removeItem).toHaveBeenCalledTimes(1);
        });
    });
});
