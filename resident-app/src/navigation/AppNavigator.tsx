import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';

import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import ReportIssueScreen from '../screens/ReportIssueScreen';
import PendingScreen from '../screens/PendingScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#052e16' }}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  // Check if they are a citizen and their verification is pending or rejected
  const needsVerification = user && profile?.role === 'citizen' && profile?.verification_status !== 'verified';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : needsVerification ? (
          <Stack.Screen name="Pending" component={PendingScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen 
              name="ReportModal" 
              component={ReportIssueScreen} 
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
