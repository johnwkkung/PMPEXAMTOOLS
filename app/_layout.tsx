import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider } from '@/template';
import { FontSizeProvider } from '@/contexts/FontSizeContext';
import { AppVersionNotice } from '@/components/ui/AppVersionNotice';

export default function RootLayout() {
  return (
    <AlertProvider>
      <FontSizeProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="home" />
            <Stack.Screen name="practice" />
            <Stack.Screen name="exam" />
            <Stack.Screen name="quiz" />
            <Stack.Screen name="results" />
            <Stack.Screen name="debug-log" />
            <Stack.Screen name="history" />
          </Stack>
          <AppVersionNotice />
        </SafeAreaProvider>
      </AuthProvider>
      </FontSizeProvider>
    </AlertProvider>
  );
}
