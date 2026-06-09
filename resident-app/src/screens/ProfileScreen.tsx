import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, MapPin, Building, Phone, Clock, CircleDot } from 'lucide-react-native';

interface UCData {
  name: string;
  district: string;
  tehsil: string;
}

interface UCSettings {
  office_open: boolean;
  chairman_name: string | null;
  contact_number: string | null;
  dealing_hours: string | null;
}

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const [ucData, setUcData] = useState<UCData | null>(null);
  const [settings, setSettings] = useState<UCSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uc_id) return;
    
    const fetchData = async () => {
      try {
        // Fetch UC details
        const { data: uc, error: ucError } = await supabase
          .from('union_councils')
          .select('name, district, tehsil')
          .eq('id', profile.uc_id)
          .single();
          
        if (ucError && ucError.code !== 'PGRST116') throw ucError;
        setUcData(uc);

        // Fetch Chairman settings
        const { data: setts, error: settsError } = await supabase
          .from('uc_settings')
          .select('office_open, chairman_name, contact_number, dealing_hours')
          .eq('uc_id', profile.uc_id)
          .single();
          
        if (settsError && settsError.code !== 'PGRST116') throw settsError;
        setSettings(setts);
      } catch (err) {
        console.error('Error fetching profile data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen to office status updates
    const channel = supabase
      .channel('public:uc_settings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'uc_settings', filter: `uc_id=eq.${profile.uc_id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.uc_id]);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Sign Out', 
        style: 'destructive',
        onPress: () => signOut() 
      }
    ]);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-900">
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface-900" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header / User Card */}
      <View className="bg-surface-800 rounded-b-3xl px-6 pt-16 pb-8 border-b border-surface-700 shadow-md">
        <View className="flex-row items-center">
          <View className="w-16 h-16 bg-brand-500/20 rounded-full items-center justify-center border border-brand-500/30">
            <User size={32} color="#4ade80" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-2xl font-bold text-surface-100">{profile?.full_name || 'Citizen'}</Text>
            <View className="flex-row items-center mt-1">
              <MapPin size={14} color="#a1a1aa" />
              <Text className="text-surface-400 ml-1 font-medium">{ucData?.name || 'Unknown UC'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View className="px-4 py-8 flex-1 justify-end">
        {/* Sign Out */}
        <TouchableOpacity 
          className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex-row items-center justify-center mt-auto"
          onPress={handleSignOut}
        >
          <LogOut size={20} color="#f87171" />
          <Text className="text-red-400 font-bold text-lg ml-2">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
