import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Home, Camera, Building2, User } from 'lucide-react-native';
import FeedScreen from '../screens/FeedScreen';
import UCHubScreen from '../screens/UCHubScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4ade80',
        tabBarInactiveTintColor: '#86efac',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          marginBottom: 4,
        },
        tabBarStyle: {
          backgroundColor: '#052e16',
          borderTopWidth: 0,
          elevation: 0,
          height: 60 + (insets.bottom > 0 ? insets.bottom - 10 : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom - 10 : 0,
          paddingTop: 8,
        },
      }}
    >
      <Tab.Screen 
        name="Feed" 
        component={FeedScreen} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={24} strokeWidth={2.5} />,
        }}
      />
      
      <Tab.Screen 
        name="Complain" 
        component={FeedScreen} // Dummy component
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('ReportModal');
          },
        }}
        options={{
          tabBarLabel: 'Report',
          tabBarIcon: ({ color }) => <Camera color={color} size={24} strokeWidth={2.5} />,
        }}
      />

      <Tab.Screen 
        name="UC Hub" 
        component={UCHubScreen} 
        options={{
          tabBarLabel: 'UC Hub',
          tabBarIcon: ({ color }) => <Building2 color={color} size={24} strokeWidth={2.5} />,
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={24} strokeWidth={2.5} />,
        }}
      />
    </Tab.Navigator>
  );
}
