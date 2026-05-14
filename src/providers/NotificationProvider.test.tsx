import { act, renderHook, waitFor } from "@testing-library/react-native";
import React from "react";

import * as NotificationService from "@/services/NotificationService";
import * as notificationPreference from "@/utils/notificationPreference";

import { NotificationProvider, useNotifications } from "./NotificationProvider";

jest.mock("@/services/NotificationService");
jest.mock("@/utils/notificationPreference");

const mockedSvc = NotificationService as jest.Mocked<typeof NotificationService>;
const mockedPref = notificationPreference as jest.Mocked<typeof notificationPreference>;

function wrapper({ children }: { children: React.ReactNode }): React.JSX.Element
{
    return <NotificationProvider>{children}</NotificationProvider>;
}

describe("NotificationProvider", () =>
{
    beforeEach(() =>
    {
        jest.clearAllMocks();
        mockedSvc.ensureSwapChannel.mockResolvedValue(undefined);
        mockedPref.saveNotificationsEnabled.mockResolvedValue(undefined);
    });

    describe("initial restore", () =>
    {
        it("syncs stored=true + granted → enabled=true and ensures channel", async () =>
        {
            mockedPref.loadNotificationsEnabled.mockResolvedValue(true);
            mockedSvc.getPermissionStatus.mockResolvedValue("granted");

            const { result } = renderHook(() => useNotifications(), { wrapper });

            await waitFor(() =>
            {
                expect(result.current.enabled).toBe(true);
            });
            expect(result.current.permissionStatus).toBe("granted");
            expect(mockedSvc.ensureSwapChannel).toHaveBeenCalled();
        });

        it("forces enabled=false when OS revoked permission", async () =>
        {
            mockedPref.loadNotificationsEnabled.mockResolvedValue(true);
            mockedSvc.getPermissionStatus.mockResolvedValue("denied");

            const { result } = renderHook(() => useNotifications(), { wrapper });

            await waitFor(() =>
            {
                expect(result.current.permissionStatus).toBe("denied");
            });
            expect(result.current.enabled).toBe(false);
        });

        it("defaults to disabled when nothing was stored", async () =>
        {
            mockedPref.loadNotificationsEnabled.mockResolvedValue(false);
            mockedSvc.getPermissionStatus.mockResolvedValue("undetermined");

            const { result } = renderHook(() => useNotifications(), { wrapper });

            await waitFor(() =>
            {
                expect(result.current.permissionStatus).toBe("undetermined");
            });
            expect(result.current.enabled).toBe(false);
        });
    });

    describe("setEnabled(true)", () =>
    {
        it("requests permission and persists when granted", async () =>
        {
            mockedPref.loadNotificationsEnabled.mockResolvedValue(false);
            mockedSvc.getPermissionStatus.mockResolvedValue("undetermined");
            mockedSvc.requestPermission.mockResolvedValue("granted");

            const { result } = renderHook(() => useNotifications(), { wrapper });
            await waitFor(() => expect(result.current.permissionStatus).toBe("undetermined"));

            await act(async () =>
            {
                await result.current.setEnabled(true);
            });

            expect(result.current.enabled).toBe(true);
            expect(result.current.permissionStatus).toBe("granted");
            expect(mockedSvc.ensureSwapChannel).toHaveBeenCalled();
            expect(mockedPref.saveNotificationsEnabled).toHaveBeenCalledWith(true);
        });

        it("keeps disabled state if OS denies", async () =>
        {
            mockedPref.loadNotificationsEnabled.mockResolvedValue(false);
            mockedSvc.getPermissionStatus.mockResolvedValue("undetermined");
            mockedSvc.requestPermission.mockResolvedValue("denied");

            const { result } = renderHook(() => useNotifications(), { wrapper });
            await waitFor(() => expect(result.current.permissionStatus).toBe("undetermined"));

            await act(async () =>
            {
                await result.current.setEnabled(true);
            });

            expect(result.current.enabled).toBe(false);
            expect(result.current.permissionStatus).toBe("denied");
            expect(mockedPref.saveNotificationsEnabled).toHaveBeenLastCalledWith(false);
        });
    });

    describe("setEnabled(false)", () =>
    {
        it("persists false and clears enabled state", async () =>
        {
            mockedPref.loadNotificationsEnabled.mockResolvedValue(true);
            mockedSvc.getPermissionStatus.mockResolvedValue("granted");

            const { result } = renderHook(() => useNotifications(), { wrapper });
            await waitFor(() => expect(result.current.enabled).toBe(true));

            await act(async () =>
            {
                await result.current.setEnabled(false);
            });

            expect(result.current.enabled).toBe(false);
            expect(mockedPref.saveNotificationsEnabled).toHaveBeenLastCalledWith(false);
            // 권한 자체는 회수 X
            expect(result.current.permissionStatus).toBe("granted");
        });
    });

    describe("notifySwapSuccess", () =>
    {
        it("is a no-op when disabled", async () =>
        {
            mockedPref.loadNotificationsEnabled.mockResolvedValue(false);
            mockedSvc.getPermissionStatus.mockResolvedValue("undetermined");

            const { result } = renderHook(() => useNotifications(), { wrapper });
            await waitFor(() => expect(result.current.enabled).toBe(false));

            await act(async () =>
            {
                await result.current.notifySwapSuccess({
                    title: "T",
                    body: "B",
                    signature: "sig",
                });
            });

            expect(mockedSvc.notifySwapSuccess).not.toHaveBeenCalled();
        });

        it("forwards to NotificationService when enabled", async () =>
        {
            mockedPref.loadNotificationsEnabled.mockResolvedValue(true);
            mockedSvc.getPermissionStatus.mockResolvedValue("granted");
            mockedSvc.notifySwapSuccess.mockResolvedValue(undefined);

            const { result } = renderHook(() => useNotifications(), { wrapper });
            await waitFor(() => expect(result.current.enabled).toBe(true));

            const payload = { title: "T", body: "B", signature: "sig-xyz" };
            await act(async () =>
            {
                await result.current.notifySwapSuccess(payload);
            });

            expect(mockedSvc.notifySwapSuccess).toHaveBeenCalledWith(payload);
        });

        it("swallows errors from NotificationService", async () =>
        {
            mockedPref.loadNotificationsEnabled.mockResolvedValue(true);
            mockedSvc.getPermissionStatus.mockResolvedValue("granted");
            mockedSvc.notifySwapSuccess.mockRejectedValue(new Error("notif backend down"));

            const { result } = renderHook(() => useNotifications(), { wrapper });
            await waitFor(() => expect(result.current.enabled).toBe(true));

            // Should not throw
            await act(async () =>
            {
                await result.current.notifySwapSuccess({
                    title: "T",
                    body: "B",
                    signature: "sig",
                });
            });
        });
    });
});
