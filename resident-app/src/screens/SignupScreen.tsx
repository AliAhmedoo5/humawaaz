import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleNext = () => {
    if (!fullName || !email || !password) return;
    navigation.navigate('Verification', { fullName, email, password });
  };

  return (
    <View className="flex-1 justify-center bg-surface-900 p-6">
      <Text className="text-3xl font-bold text-surface-100 mb-2">Create Account</Text>
      <Text className="text-surface-400 mb-8">Join Hum-Awaaz to improve your neighborhood.</Text>

      <View className="space-y-4 mb-8">
        <View>
          <Text className="text-sm font-medium text-surface-400 mb-1.5">Full Name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. Ahmed Khan"
            placeholderTextColor="#52525b"
            className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-surface-100 focus:border-brand-500"
          />
        </View>

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
        className="bg-brand-500 py-3.5 px-6 rounded-xl w-full mb-4"
        onPress={handleNext}
      >
        <Text className="text-white font-bold text-lg text-center">Continue to Location</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        className="py-3 px-6 rounded-xl w-full"
        onPress={() => navigation.goBack()}
      >
        <Text className="text-surface-400 font-medium text-center">Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}
