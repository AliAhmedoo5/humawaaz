import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { View, Text, TouchableOpacity } from 'react-native';

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

// Error Boundary to prevent white-screen crashes
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#052e16', padding: 24 }}>
          <Text style={{ color: '#4ade80', fontSize: 28, fontWeight: '800', marginBottom: 12 }}>Oops!</Text>
          <Text style={{ color: '#d4d4d8', fontSize: 16, textAlign: 'center', marginBottom: 8 }}>
            Something went wrong.
          </Text>
          <Text style={{ color: '#71717a', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: '#4ade80', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
          >
            <Text style={{ color: '#052e16', fontWeight: '700', fontSize: 16 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// Fall back to the hardcoded working key if Expo's .env cache is broken
const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_ZmluZS1iZWFyLTQuY2xlcmsuYWNjb3VudHMuZGV2JA";

export default function App() {
  return (
    <ErrorBoundary>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <SafeAreaProvider>
          <AuthProvider>
            <AnimatedSplashScreen>
              <AppNavigator />
            </AnimatedSplashScreen>
          </AuthProvider>
        </SafeAreaProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

