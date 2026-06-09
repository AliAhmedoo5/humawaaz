import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { CheckCircle2, FileText, UploadCloud, MapPin, XCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export default function VerificationScreen({ route }: any) {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { fullName, email, password } = route.params || {};
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFile(result.assets[0]);
      }
    } catch (err) {
      console.warn("Document picker error:", err);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      // 100% reliable React Native upload method using base64-arraybuffer
      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, { encoding: 'base64' });
      const arrayBuffer = decode(base64);

      const { data, error } = await supabase.storage
        .from('verification_documents')
        .upload(filePath, arrayBuffer, { 
          contentType: selectedFile.mimeType || 'application/pdf',
          upsert: true
        });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('verification_documents')
        .getPublicUrl(filePath);

      setUploadComplete(true);
      setIsUploading(false);
      
      // Navigate to onboarding map after brief success state
      setTimeout(() => {
        navigation.navigate('Onboarding', { 
          fullName, 
          email, 
          password,
          documentUrl: publicUrlData.publicUrl 
        });
      }, 1000);

    } catch (err: any) {
      console.error('Upload Error:', err);
      Alert.alert('Upload Failed', err.message || 'Failed to upload document. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <ScrollView 
      className="flex-1 bg-surface-900" 
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 64, paddingBottom: 40, flexGrow: 1 }}
    >
      <Text className="text-3xl font-bold text-surface-100 mb-3">Verify Your Residency</Text>
      <Text className="text-surface-400 leading-relaxed mb-6">
        To report issues in your neighborhood, please upload a recent K-Electric or SSGC bill (PDF format).
      </Text>

      {/* GPS Pill */}
      <View className="self-start flex-row items-center bg-surface-800 border border-surface-700 px-4 py-2 rounded-full mb-8">
        <MapPin color="#4ade80" size={18} />
        <Text className="text-surface-200 font-bold text-sm mr-3 ml-2">Locating your UC via GPS...</Text>
        <View className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-pulse" />
      </View>

      {/* Upload Area */}
      <View className="bg-surface-800 rounded-3xl p-6 mb-8 border border-surface-700 items-center justify-center min-h-[200px]">
        {selectedFile ? (
          <View className="items-center w-full py-4">
            <View className="w-16 h-16 bg-brand-500/10 rounded-full items-center justify-center mb-4">
              <FileText color="#4ade80" size={32} />
            </View>
            <Text className="text-surface-100 font-bold text-center mb-1">{selectedFile.name}</Text>
            <Text className="text-surface-400 text-xs text-center mb-6">
              {(selectedFile.size! / 1024 / 1024).toFixed(2)} MB • PDF Document
            </Text>
            
            <TouchableOpacity 
              onPress={() => setSelectedFile(null)}
              className="flex-row items-center border border-surface-600 px-4 py-2 rounded-full"
            >
              <XCircle color="#ef4444" size={16} style={{marginRight: 8}} />
              <Text className="text-surface-300 font-medium">Remove File</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            onPress={handlePickDocument}
            className="items-center justify-center w-full py-10 border-2 border-dashed border-surface-600 rounded-2xl bg-surface-900/50"
          >
            <View className="w-14 h-14 bg-surface-700 rounded-full items-center justify-center mb-4">
              <UploadCloud color="#4ade80" size={28} />
            </View>
            <Text className="text-surface-200 font-bold mb-2">Tap to select PDF</Text>
            <Text className="text-surface-400 text-xs text-center px-4">
              Max file size: 5MB. Must clearly show your address.
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Requirements */}
      <View className="mb-8">
        <Text className="text-surface-300 font-bold mb-3 flex-row items-center">
           Upload Requirements
        </Text>
        <View className="space-y-3">
          <View className="flex-row items-center bg-surface-800 border border-surface-700 rounded-xl p-3">
            <CheckCircle2 color="#4ade80" size={20} style={{marginRight: 12}} />
            <Text className="text-surface-200 flex-1">Address must match Karachi UC jurisdiction.</Text>
          </View>
          <View className="flex-row items-center bg-surface-800 border border-surface-700 rounded-xl p-3 mt-2">
            <CheckCircle2 color="#4ade80" size={20} style={{marginRight: 12}} />
            <Text className="text-surface-200 flex-1">Utility bill must be from the last 3 months.</Text>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <TouchableOpacity 
        className={`py-4 px-6 rounded-xl flex-row justify-center items-center flex-wrap ${!selectedFile ? 'bg-surface-700' : 'bg-brand-500'}`}
        onPress={handleUpload}
        disabled={isUploading || uploadComplete || !selectedFile}
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" />
        ) : uploadComplete ? (
          <>
            <CheckCircle2 color="#fff" size={20} style={{marginRight: 8}} />
            <Text className="text-white font-bold text-lg text-center flex-shrink">Upload Successful</Text>
          </>
        ) : (
          <>
            <UploadCloud color={!selectedFile ? '#9ca3af' : '#fff'} size={20} style={{marginRight: 8}} />
            <Text className={`font-bold text-lg text-center flex-shrink ${!selectedFile ? 'text-surface-400' : 'text-white'}`}>
              Submit Document
            </Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}
