import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { X, Camera, Image as ImageIcon, MapPin, Upload, AlertTriangle, Check } from 'lucide-react-native';

const DEPARTMENTS = [
  'SSWMB (Solid Waste)',
  'KWSB (Water & Sewerage)',
  'K-Electric',
  'KMC (Metropolitan)',
  'DMC (District)',
  'Traffic Police',
  'Other'
];

export default function ReportIssueScreen() {
  const { profile, user } = useAuth();
  const navigation = useNavigation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(DEPARTMENTS[0]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  
  const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocode && geocode.length > 0) {
        const place = geocode[0];
        const addressParts = [place.street, place.district, place.city].filter(Boolean);
        setAddress(addressParts.join(', ') || 'Unknown Location');
      } else {
        setAddress('Unknown Location');
      }
    } catch (err) {
      console.log('Reverse geocode error:', err);
      setAddress('Unknown Location');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Please enable location permissions to report an issue.');
          return;
        }

        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        await fetchAddress(loc.coords.latitude, loc.coords.longitude);
      } catch (err) {
        console.log('Error fetching location:', err);
        setLocation({
          latitude: 24.8607,
          longitude: 67.0011,
        });
        await fetchAddress(24.8607, 67.0011);
      } finally {
        setLoadingLocation(false);
      }
    })();
  }, []);

  const handleTakePhoto = async () => {
    setShowPhotoOptions(false);
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Camera Access Denied", "You've refused to allow this app to access your camera!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.5, // compress image
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handlePickFromGallery = async () => {
    setShowPhotoOptions(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert("Gallery Access Denied", "You've refused to allow this app to access your photos!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5, // compress image
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      const ext = uri.substring(uri.lastIndexOf(".") + 1);
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
      
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      } as any);

      const { data, error } = await supabase.storage
        .from('complaints') // Assuming bucket is 'complaints'
        .upload(`images/${fileName}`, formData, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { data: publicUrlData } = supabase.storage
        .from('complaints')
        .getPublicUrl(`images/${fileName}`);

      return publicUrlData.publicUrl;
    } catch (err) {
      console.error('Error uploading photo:', err);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please provide a title for the issue.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please provide a description for the issue.');
      return;
    }
    if (!location) {
      Alert.alert('Location Missing', 'Please pin the location of the issue on the map.');
      return;
    }
    if (!profile?.uc_id || !user?.id) {
      Alert.alert('Account Error', 'Your account is missing necessary profile data. Please restart the app.');
      return;
    }

    setSubmitting(true);
    try {
      let finalPhotoUrl = '';
      if (photoUri) {
        const uploadedUrl = await uploadPhoto(photoUri);
        if (uploadedUrl) finalPhotoUrl = uploadedUrl;
      }

      // WKT format for PostGIS geometry Point
      const locationWKT = `POINT(${location.longitude} ${location.latitude})`;

      const { error } = await supabase.from('complaints').insert({
        title,
        description,
        department: category,
        location: locationWKT,
        address,
        photo_url: finalPhotoUrl,
        user_id: user.id, // Clerk user ID
        uc_id: profile.uc_id,
        status: 'pending',
        is_urgent: isUrgent,
      });

      if (error) throw error;

      Alert.alert('Success', 'Your complaint has been submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Submit Error:', error);
      Alert.alert('Error', error.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-16 pb-4 bg-surface-800 border-b border-surface-700">
        <Text className="text-xl font-bold text-surface-100">Report an Issue</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="px-3 py-1.5 bg-surface-700 rounded-full flex-row items-center">
          <Text className="text-surface-200 text-sm font-bold mr-1">Back to Home</Text>
          <X size={16} color="#e4e4e7" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* Title */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-surface-400 mb-2">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Broken street light"
            placeholderTextColor="#52525b"
            className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-surface-100 focus:border-brand-500"
          />
        </View>

        {/* Category */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-surface-400 mb-2">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            {DEPARTMENTS.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                className={`mr-3 px-4 py-2 rounded-full border ${
                  category === cat 
                    ? 'bg-brand-500/20 border-brand-500 text-brand-400' 
                    : 'bg-surface-800 border-surface-700'
                }`}
              >
                <Text className={`font-medium ${category === cat ? 'text-brand-400' : 'text-surface-300'}`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Description */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-surface-400 mb-2">Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Provide specific details about the issue..."
            placeholderTextColor="#52525b"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="w-full px-4 py-3 bg-surface-800 border border-surface-700 rounded-xl text-surface-100 focus:border-brand-500 min-h-[100px]"
          />
        </View>

        {/* Location Pinning */}
        <View className="mb-6">
          <View className="flex-row justify-between items-end mb-2">
            <Text className="text-sm font-medium text-surface-400">Pin Location</Text>
            <Text className="text-xs text-surface-500">Drag to adjust</Text>
          </View>
          
          <View className="w-full h-48 rounded-xl overflow-hidden border border-surface-700">
            {loadingLocation ? (
              <View className="flex-1 items-center justify-center bg-surface-800">
                <ActivityIndicator color="#4ade80" />
              </View>
            ) : (
              <MapView
                className="w-full h-full"
                initialRegion={{
                  latitude: location?.latitude || 24.8607,
                  longitude: location?.longitude || 67.0011,
                  latitudeDelta: 0.005,
                  longitudeDelta: 0.005,
                }}
                onPress={async (e) => {
                  setLocation(e.nativeEvent.coordinate);
                  await fetchAddress(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude);
                }}
              >
                {location && (
                  <Marker 
                    coordinate={location} 
                    draggable 
                    onDragEnd={async (e) => {
                      setLocation(e.nativeEvent.coordinate);
                      await fetchAddress(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude);
                    }} 
                  />
                )}
              </MapView>
            )}
          </View>
          {address ? (
            <Text className="text-surface-400 text-xs mt-2 px-1">
              <MapPin size={12} color="#a1a1aa" /> {address}
            </Text>
          ) : null}
        </View>

        {/* Photo Upload */}
        <View className="mb-8">
          <Text className="text-sm font-medium text-surface-400 mb-2">Attach Photo (Optional)</Text>
          {photoUri ? (
            <View className="relative w-full h-48 rounded-xl overflow-hidden border border-surface-700">
              <Image source={{ uri: photoUri }} className="w-full h-full" resizeMode="cover" />
              <TouchableOpacity 
                className="absolute top-2 right-2 bg-black/60 p-2 rounded-full"
                onPress={() => setPhotoUri(null)}
              >
                <X size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
              <TouchableOpacity 
              className="w-full py-8 border-2 border-dashed border-surface-600 bg-surface-800/50 rounded-xl items-center justify-center"
              onPress={() => {
                Alert.alert(
                  "Attach Photo",
                  "Choose a source for your photo:",
                  [
                    { text: "Take a Photo", onPress: handleTakePhoto },
                    { text: "Choose from Gallery", onPress: handlePickFromGallery },
                    { text: "Cancel", style: "cancel" }
                  ],
                  { cancelable: true }
                );
              }}
            >
              <Upload size={32} color="#71717a" className="mb-2" />
              <Text className="text-surface-300 font-medium">Tap to upload photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Urgency */}
        <View className="mb-8">
          <Text className="text-sm font-medium text-surface-400 mb-2">Urgency</Text>
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setIsUrgent(!isUrgent)}
            className={`border rounded-xl p-4 flex-row items-center justify-between ${isUrgent ? 'border-red-500/50 bg-red-500/10' : 'border-surface-700 bg-surface-800'}`}
          >
            <View className="flex-row items-center gap-3">
              <View className={`w-10 h-10 rounded-full flex items-center justify-center ${isUrgent ? 'bg-red-500/20' : 'bg-surface-700'}`}>
                <AlertTriangle size={20} color={isUrgent ? '#ef4444' : '#a1a1aa'} />
              </View>
              <View>
                <Text className={`font-bold ${isUrgent ? 'text-red-400' : 'text-surface-200'}`}>Flag as Urgent</Text>
                <Text className="text-surface-500 text-xs">Requires immediate attention</Text>
              </View>
            </View>
            <View className={`w-6 h-6 rounded-full border flex items-center justify-center ${isUrgent ? 'border-red-500 bg-red-500' : 'border-surface-600 bg-transparent'}`}>
              {isUrgent && <Check size={14} color="#fff" />}
            </View>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          className={`py-4 rounded-xl items-center justify-center ${
            !title || !description ? 'bg-surface-700' : 'bg-brand-500'
          }`}
          onPress={handleSubmit}
          disabled={!title || !description || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className={`font-bold text-lg ${!title || !description ? 'text-surface-500' : 'text-white'}`}>
              Submit Issue
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>

    </View>
  );
}
