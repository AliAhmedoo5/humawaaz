import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (error) {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';

import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';

// Fall back to the hardcoded working key if Expo's .env cache is broken, but prefer process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_ZmluZS1iZWFyLTQuY2xlcmsuYWNjb3VudHMuZGV2JA";

export default function App() {
  if (!publishableKey) {
    console.warn('Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env file');
  }

  return (
    <ClerkProvider publishableKey={publishableKey || "pk_test_missing"} tokenCache={tokenCache}>
      <SafeAreaProvider>
        <AuthProvider>
          <AnimatedSplashScreen>
            <AppNavigator />
          </AnimatedSplashScreen>
        </AuthProvider>
      </SafeAreaProvider>
    </ClerkProvider>
  );
}
