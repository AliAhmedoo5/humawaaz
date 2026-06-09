import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSignUp } from '@clerk/clerk-expo';
import { supabase } from '../lib/supabase';
import { useNavigation } from '@react-navigation/native';

export default function OnboardingScreen({ route }: any) {
  const { fullName, email, password, documentUrl } = route.params || {};
  const { signUp, isLoaded, setActive } = useSignUp();
  const navigation = useNavigation<any>();
  
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [selectedUcId, setSelectedUcId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable location permissions.');
          setLoadingLocation(false);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } catch (err) {
        console.log('Error fetching location:', err);
        // Fallback to default Karachi location if GPS is unavailable
        setLocation({
          latitude: 24.8607,
          longitude: 67.0011,
        });
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const handleRegisterAndSendCode = async () => {
    if (!location) {
      Alert.alert('Please drop a pin on the map to continue.');
      return;
    }
    if (!isLoaded) {
      Alert.alert('Still Connecting', 'Please wait just a second while the secure authentication system finishes loading.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Validate UC Location via Supabase RPC
      const { data: ucId, error: rpcError } = await supabase.rpc('get_uc_from_location', {
        lon: location.longitude,
        lat: location.latitude,
      });

      if (rpcError) throw rpcError;
      if (!ucId) {
        Alert.alert('Out of Bounds', 'Your selected location does not fall within a known Karachi Union Council.');
        setSubmitting(false);
        return;
      }
      
      setSelectedUcId(ucId);

      // 2. Start Clerk Signup
      await signUp.create({
        emailAddress: email,
        password,
        unsafeMetadata: {
          full_name: fullName,
          role: 'citizen',
          uc_id: ucId,
        }
      });

      // 3. Send Verification Email
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
      
    } catch (err: any) {
      console.error(err);
      Alert.alert('Registration Error', err.errors?.[0]?.longMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!isLoaded) return;
    setSubmitting(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      
      if (completeSignUp.status === 'complete') {
        // Clerk auth successful! Set active session
        await setActive({ session: completeSignUp.createdSessionId });
        
        // Insert profile into Supabase directly since RLS allows it
        const { error: profileError } = await supabase.from('profiles').insert({
          id: completeSignUp.createdUserId,
          full_name: fullName,
          role: 'citizen',
          is_verified: true, // email verified
          verification_status: 'pending',
          document_url: documentUrl,
          uc_id: selectedUcId,
        });

        if (profileError) {
          console.error('Failed to create Supabase profile:', profileError);
          Alert.alert('Warning', 'Account created but profile setup failed.');
        } else {
          Alert.alert('Location Confirmed', 'Your residency document has been submitted to your local UC for review.');
        }
      } else {
        console.error(completeSignUp);
        Alert.alert('Verification Incomplete', 'Please try again.');
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Verification Failed', err.errors?.[0]?.longMessage || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLocation) {
    return (
      <View className="flex-1 items-center justify-center bg-surface-900">
        <ActivityIndicator size="large" color="#4ade80" />
        <Text className="text-surface-400 mt-4">Locating you...</Text>
      </View>
    );
  }

  // --- Verification Code UI ---
  if (pendingVerification) {
    return (
      <View className="flex-1 justify-center bg-surface-900 p-6">
        <View className="mb-10 items-center">
          <Text className="text-3xl font-bold text-surface-100 mb-2">Check your email</Text>
          <Text className="text-surface-400 font-medium text-center">
            We sent a verification code to {email}. Enter it below to complete registration.
          </Text>
        </View>

        <View className="mb-8">
          <TextInput
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            placeholder="123456"
            placeholderTextColor="#52525b"
            className="w-full px-4 py-4 bg-surface-800 border border-surface-700 rounded-xl text-surface-100 text-center text-2xl focus:border-brand-500"
            style={{ letterSpacing: 10 }}
          />
        </View>

        <TouchableOpacity 
          className="bg-brand-500 py-3.5 px-6 rounded-xl w-full mb-4 flex-row justify-center items-center"
          onPress={handleVerifyEmail}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg text-center">Verify Account</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // --- Map UI ---
  return (
    <View className="flex-1 bg-surface-900">
      <View className="p-6 pt-16 bg-surface-900 z-10 shadow-md">
        <Text className="text-3xl font-bold text-surface-100 mb-2">Locate Residence</Text>
        <Text className="text-surface-400 text-sm">
          Please adjust the pin to your exact home location. This permanently assigns your profile to your local Union Council.
        </Text>
      </View>

      <View className="flex-1 overflow-hidden relative">
        <MapView
          className="w-full h-full"
          initialRegion={{
            latitude: location?.latitude || 24.8607,
            longitude: location?.longitude || 67.0011,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={(e) => setLocation(e.nativeEvent.coordinate)}
        >
          {location && (
            <Marker coordinate={location} draggable onDragEnd={(e) => setLocation(e.nativeEvent.coordinate)} />
          )}
        </MapView>
      </View>

      <View className="p-6 bg-surface-900 border-t border-surface-800">
        <TouchableOpacity 
          className="bg-brand-500 py-4 px-6 rounded-xl w-full flex-row justify-center items-center"
          onPress={handleRegisterAndSendCode}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-lg text-center">Confirm Location & Register</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
