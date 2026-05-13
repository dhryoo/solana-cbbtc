import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_KEY = "wallet:authToken";

export async function saveAuthToken(token: string): Promise<void>
{
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function loadAuthToken(): Promise<string | null>
{
    try
    {
        return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    }
    catch
    {
        // Storage 손상 시 토큰 없는 것으로 간주하고 신규 연결 유도
        return null;
    }
}

export async function clearAuthToken(): Promise<void>
{
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}
