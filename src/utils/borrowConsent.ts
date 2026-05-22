import AsyncStorage from "@react-native-async-storage/async-storage";

// D-6: 첫 차입(borrow) 전 위험 consent 모달을 1회 강제. 동의하면 플래그 저장.
const KEY = "lending:borrowConsent:given";

export async function loadBorrowConsent(): Promise<boolean>
{
    try
    {
        const raw = await AsyncStorage.getItem(KEY);
        return raw === "1";
    }
    catch
    {
        return false;
    }
}

export async function saveBorrowConsent(): Promise<void>
{
    await AsyncStorage.setItem(KEY, "1");
}
