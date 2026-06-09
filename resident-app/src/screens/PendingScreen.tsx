import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Clock, RefreshCcw, LogOut, UploadCloud } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';

export default function PendingScreen() {
  const { refreshProfile, signOut, profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);

  const status = profile?.verification_status || 'pending';

  const handleReupload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const selectedFile = result.assets[0];

      setIsUploading(true);
      
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const base64 = await FileSystem.readAsStringAsync(selectedFile.uri, { encoding: 'base64' });
      const arrayBuffer = decode(base64);

      const { data, error: uploadError } = await supabase.storage
        .from('verification_documents')
        .upload(filePath, arrayBuffer, { 
          contentType: selectedFile.mimeType || 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('verification_documents')
        .getPublicUrl(filePath);

      // Update profile back to pending
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending',
          document_url: publicUrlData.publicUrl
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      Alert.alert('Success', 'New document submitted for review!');
      await refreshProfile();
      
    } catch (err: any) {
      console.error(err);
      Alert.alert('Upload Failed', err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-900 px-6 justify-center items-center">
      {status === 'rejected' ? (
        <>
          <View className="w-24 h-24 bg-red-500/10 rounded-full items-center justify-center mb-8">
            <Text className="text-4xl">❌</Text>
          </View>
          <Text className="text-2xl font-bold text-surface-100 mb-4 text-center">Verification Rejected</Text>
          <Text className="text-surface-400 text-center mb-10 leading-relaxed">
            Your verification document was rejected by the UC officials. Please upload a clear, recent K-Electric or SSGC bill matching your location.
          </Text>

          <TouchableOpacity 
            className="w-full bg-brand-500 py-4 rounded-xl flex-row justify-center items-center mb-4"
            onPress={handleReupload}
            disabled={isUploading}
          >
            {isUploading ? <ActivityIndicator color="#fff" /> : (
              <>
                <UploadCloud color="#fff" size={20} className="mr-2" />
                <Text className="text-white font-bold ml-2">Upload New Document</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View className="w-24 h-24 bg-amber-500/10 rounded-full items-center justify-center mb-8">
            <Clock color="#fbbf24" size={48} />
          </View>
          <Text className="text-2xl font-bold text-surface-100 mb-4 text-center">Verification Pending</Text>
          <Text className="text-surface-400 text-center mb-10 leading-relaxed">
            Your account is currently under review by official authorities. It typically takes 1-2 days to verify your residency document.
          </Text>
        </>
      )}

      {status !== 'rejected' && (
        <TouchableOpacity 
          className="w-full bg-surface-800 border border-surface-700 py-4 rounded-xl flex-row justify-center items-center mb-4"
          onPress={() => refreshProfile()}
        >
          <RefreshCcw color="#4ade80" size={20} className="mr-2" />
          <Text className="text-brand-400 font-bold ml-2">Check Status Again</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        className="w-full py-4 rounded-xl flex-row justify-center items-center"
        onPress={() => signOut()}
      >
        <LogOut color="#ef4444" size={20} className="mr-2" />
        <Text className="text-red-400 font-bold ml-2">Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}
