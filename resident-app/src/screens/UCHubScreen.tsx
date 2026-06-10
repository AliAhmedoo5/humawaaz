import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { MapPin, User, Phone, Clock, Building, CircleDot, UserCircle2, Megaphone, Info, HandHeart, Trash2, Droplet, Wrench, TreePine, Lightbulb, HelpCircle } from 'lucide-react-native';

interface Announcement {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

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
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
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

        // Fetch Announcements
        const { data: ann, error: annError } = await supabase
          .from('announcements')
          .select('id, type, title, body, created_at')
          .eq('uc_id', profile.uc_id)
          .order('created_at', { ascending: false });
        if (annError) console.error('Error fetching announcements:', annError);
        else setAnnouncements(ann || []);
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements', filter: `uc_id=eq.${profile.uc_id}` },
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

        {/* Department Guide */}
        <View className="mb-4 flex-row items-center justify-between px-2">
          <View className="flex-row items-center">
            <HelpCircle size={20} color="#f4f4f5" />
            <Text className="text-surface-100 font-bold text-lg ml-2">Department Guide</Text>
          </View>
        </View>

        <View className="bg-surface-800 rounded-3xl overflow-hidden mb-8 border border-surface-700 shadow-md">
          {/* Sanitation */}
          <View className="p-4 border-b border-surface-700 flex-row items-start">
            <View className="w-10 h-10 bg-emerald-500/10 rounded-full items-center justify-center mr-3 shrink-0">
              <Trash2 size={20} color="#34d399" />
            </View>
            <View className="flex-1">
              <Text className="text-surface-100 font-bold text-base mb-1">Sanitation & Solid Waste</Text>
              <Text className="text-surface-400 text-xs leading-relaxed">Garbage collection, overflowing dumpsters, street sweeping, and dead animal removal.</Text>
            </View>
          </View>

          {/* Water */}
          <View className="p-4 border-b border-surface-700 flex-row items-start">
            <View className="w-10 h-10 bg-blue-500/10 rounded-full items-center justify-center mr-3 shrink-0">
              <Droplet size={20} color="#60a5fa" />
            </View>
            <View className="flex-1">
              <Text className="text-surface-100 font-bold text-base mb-1">Water Supply & Sewerage</Text>
              <Text className="text-surface-400 text-xs leading-relaxed">Water shortages, contaminated supply, blocked gutters, and leaking pipelines.</Text>
            </View>
          </View>

          {/* Infrastructure */}
          <View className="p-4 border-b border-surface-700 flex-row items-start">
            <View className="w-10 h-10 bg-amber-500/10 rounded-full items-center justify-center mr-3 shrink-0">
              <Wrench size={20} color="#fbbf24" />
            </View>
            <View className="flex-1">
              <Text className="text-surface-100 font-bold text-base mb-1">Infrastructure & Roads</Text>
              <Text className="text-surface-400 text-xs leading-relaxed">Potholes, broken pavements, damaged bridges, and missing manhole covers.</Text>
            </View>
          </View>

          {/* Parks */}
          <View className="p-4 border-b border-surface-700 flex-row items-start">
            <View className="w-10 h-10 bg-green-500/10 rounded-full items-center justify-center mr-3 shrink-0">
              <TreePine size={20} color="#4ade80" />
            </View>
            <View className="flex-1">
              <Text className="text-surface-100 font-bold text-base mb-1">Parks & Horticulture</Text>
              <Text className="text-surface-400 text-xs leading-relaxed">Unmaintained parks, fallen trees, overgrown bushes, and damaged playground equipment.</Text>
            </View>
          </View>

          {/* Street Lights */}
          <View className="p-4 flex-row items-start">
            <View className="w-10 h-10 bg-yellow-500/10 rounded-full items-center justify-center mr-3 shrink-0">
              <Lightbulb size={20} color="#facc15" />
            </View>
            <View className="flex-1">
              <Text className="text-surface-100 font-bold text-base mb-1">Street Lights</Text>
              <Text className="text-surface-400 text-xs leading-relaxed">Broken or flickering street lights, exposed wiring, and dark alleyways.</Text>
            </View>
          </View>
        </View>

        {/* Notice Board */}
        <View className="mb-4 mt-2 flex-row items-center justify-between px-2">
          <View className="flex-row items-center">
            <Megaphone size={20} color="#f4f4f5" />
            <Text className="text-surface-100 font-bold text-lg ml-2">Notice Board</Text>
          </View>
        </View>

        {announcements.length === 0 ? (
          <View className="bg-surface-800 rounded-2xl p-6 items-center border border-surface-700 border-dashed mb-8">
            <Megaphone size={32} color="#52525b" />
            <Text className="text-surface-300 font-semibold mt-3">No active notices</Text>
            <Text className="text-surface-500 text-sm text-center mt-1">There are no announcements from your Union Council at this time.</Text>
          </View>
        ) : (
          <View className="mb-8">
            {announcements.map((notice) => (
              <View key={notice.id} className="bg-surface-800 rounded-2xl p-5 mb-4 border border-surface-700 shadow-sm">
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-row items-center">
                    {notice.type === 'announcement' ? (
                      <View className="bg-brand-500/20 px-2 py-1 rounded flex-row items-center">
                        <Info size={12} color="#4ade80" />
                        <Text className="text-brand-400 text-[10px] uppercase font-bold tracking-wider ml-1">Announcement</Text>
                      </View>
                    ) : (
                      <View className="bg-amber-500/20 px-2 py-1 rounded flex-row items-center">
                        <HandHeart size={12} color="#fbbf24" />
                        <Text className="text-amber-400 text-[10px] uppercase font-bold tracking-wider ml-1">Civic Request</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-surface-500 text-xs">{timeAgo(notice.created_at)}</Text>
                </View>
                <Text className="text-surface-100 font-bold text-lg mb-2">{notice.title}</Text>
                <Text className="text-surface-300 text-sm leading-relaxed">{notice.body}</Text>
              </View>
            ))}
          </View>
        )}

      </View>
    </ScrollView>
  );
}
