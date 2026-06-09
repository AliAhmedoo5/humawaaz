import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MapPin, User, Phone, Clock, Building, CircleDot, UserCircle2 } from 'lucide-react-native';

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
  chairman_description: string | null;
  chairman_avatar_url: string | null;
}

interface OfficialProfile {
  full_name: string;
  avatar_url: string | null;
}

export default function UCHubScreen() {
  const { profile } = useAuth();
  const [ucData, setUcData] = useState<UCData | null>(null);
  const [settings, setSettings] = useState<UCSettings | null>(null);
  const [official, setOfficial] = useState<OfficialProfile | null>(null);
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
          .select('office_open, chairman_name, contact_number, dealing_hours, chairman_description, chairman_avatar_url')
          .eq('uc_id', profile.uc_id)
          .single();
        if (settsError && settsError.code !== 'PGRST116') throw settsError;
        setSettings(setts);

        // Fetch Official profile
        const { data: off, error: offError } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('uc_id', profile.uc_id)
          .in('role', ['official', 'admin'])
          .limit(1)
          .single();
        if (offError && offError.code !== 'PGRST116') throw offError;
        if (off) setOfficial(off);
      } catch (err) {
        console.error('Error fetching UC Hub data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen to office status updates
    const channel = supabase
      .channel('public:uc_settings_hub')
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-surface-900">
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  const chairmanName = settings?.chairman_name || official?.full_name || 'Not specified';
  const chairmanAvatar = settings?.chairman_avatar_url || official?.avatar_url;
  const chairmanDesc = settings?.chairman_description || `Dedicated to improving infrastructure, sanitation, and community services in ${ucData?.name || 'this area'} and surrounding regions.`;

  return (
    <ScrollView className="flex-1 bg-surface-900" contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View className="px-6 pt-16 pb-6 bg-surface-800 border-b border-surface-700 shadow-md">
        <Text className="text-3xl font-bold text-surface-100">UC Hub</Text>
        <View className="flex-row items-center mt-2">
          <MapPin size={14} color="#a1a1aa" />
          <Text className="text-surface-400 ml-1.5 font-medium">{ucData?.name || 'Your Area'}</Text>
        </View>
      </View>

      <View className="px-4 py-6">
        
        {/* Office Status Badge */}
        <View className={`mb-6 p-4 rounded-2xl flex-row items-center border ${
          settings?.office_open 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <CircleDot size={20} color={settings?.office_open ? '#4ade80' : '#f87171'} />
          <View className="ml-3">
            <Text className={`font-bold text-lg ${settings?.office_open ? 'text-green-400' : 'text-red-400'}`}>
              {settings?.office_open ? 'Office is Open' : 'Office is Closed'}
            </Text>
            <Text className="text-surface-300 text-sm mt-0.5">
              {settings?.office_open ? 'The UC office is currently operating.' : 'The UC office is not taking visitors.'}
            </Text>
          </View>
        </View>

        {/* Chairman Highlight Card */}
        <View className="bg-white rounded-3xl overflow-hidden shadow-lg mb-8 elevation-5">
          {chairmanAvatar ? (
            <Image source={{ uri: chairmanAvatar }} className="w-full h-72 bg-surface-100" resizeMode="cover" />
          ) : (
            <View className="w-full h-72 bg-surface-100 items-center justify-center">
              <UserCircle2 size={80} color="#a1a1aa" />
            </View>
          )}
          <View className="p-6 bg-white">
            <Text className="text-brand-600 text-xs font-bold uppercase tracking-widest mb-1.5">UC Chairman</Text>
            <Text className="text-2xl font-black text-gray-900 mb-3">{chairmanName}</Text>
            <Text className="text-gray-600 leading-relaxed text-[15px] font-medium">
              {chairmanDesc}
            </Text>
          </View>
        </View>

        {/* Chairman & UC Info Directory */}
        <Text className="text-surface-100 font-bold text-lg mb-4 px-2">Union Council Details</Text>
        
        <View className="bg-white rounded-3xl overflow-hidden mb-8 shadow-md elevation-3">
          <View className="p-5 border-b border-gray-100 flex-row items-center">
            <View className="w-12 h-12 bg-brand-50 rounded-full items-center justify-center mr-4 shrink-0">
              <User size={24} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">Chairman</Text>
              <Text className="text-gray-900 font-bold text-base flex-wrap">{chairmanName}</Text>
            </View>
          </View>
          
          <View className="p-5 border-b border-gray-100 flex-row items-center">
            <View className="w-12 h-12 bg-brand-50 rounded-full items-center justify-center mr-4 shrink-0">
              <Phone size={24} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">Contact</Text>
              <Text className="text-gray-900 font-bold text-base flex-wrap">{settings?.contact_number || 'Not specified'}</Text>
            </View>
          </View>
          
          <View className="p-5 border-b border-gray-100 flex-row items-center">
            <View className="w-12 h-12 bg-brand-50 rounded-full items-center justify-center mr-4 shrink-0">
              <Clock size={24} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">Dealing Hours</Text>
              <Text className="text-gray-900 font-bold text-base flex-wrap">{settings?.dealing_hours || 'Not specified'}</Text>
            </View>
          </View>

          <View className="p-5 flex-row items-center">
            <View className="w-12 h-12 bg-brand-50 rounded-full items-center justify-center mr-4 shrink-0">
              <Building size={24} color="#16a34a" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-0.5">Region</Text>
              <Text className="text-gray-900 font-bold text-base flex-wrap">
                {ucData ? `${ucData.tehsil}, ${ucData.district}` : 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
