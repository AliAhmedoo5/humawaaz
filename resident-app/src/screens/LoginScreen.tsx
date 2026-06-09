import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSignIn } from '@clerk/clerk-expo';

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { signIn, setActive, isLoaded } = useSignIn();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!isLoaded || !email || !password) return;
    setLoading(true);
    
    try {
      const completeSignIn = await signIn.create({
        identifier: email,
        password,
      });
      
      if (completeSignIn.status === 'complete') {
        await setActive({ session: completeSignIn.createdSessionId });
      } else {
        // Log additional steps if required (MFA etc)
        console.error('Sign in not complete:', completeSignIn);
        Alert.alert('Login Incomplete', 'Further steps are required to sign in.');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Login Failed', err.errors?.[0]?.longMessage || err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-surface-900 p-6">
      <View className="mb-10 items-center">
        <Text className="text-4xl font-bold text-surface-100 mb-2">Hum-Awaaz</Text>
        <Text className="text-surface-400 font-medium">Citizen Mobile App</Text>
      </View>

      <View className="space-y-4 mb-8">
        <View>
          <Text className="text-sm font-medium text-surface-400 mb-1.5">Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="citizen@humawaaz.pk"
            placeholderTextColor="#52525b"
            className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-surface-100 focus:border-brand-500"
          />
        </View>

        <View>
          <Text className="text-sm font-medium text-surface-400 mb-1.5">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor="#52525b"
            className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-surface-100 focus:border-brand-500"
          />
        </View>
      </View>

      <TouchableOpacity 
        className="bg-brand-500 py-3.5 px-6 rounded-xl w-full mb-4 flex-row justify-center items-center"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-bold text-lg text-center">Sign In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        className="py-3 px-6 rounded-xl w-full"
        onPress={() => navigation.navigate('Signup')}
      >
        <Text className="text-surface-400 font-medium text-center">Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}
