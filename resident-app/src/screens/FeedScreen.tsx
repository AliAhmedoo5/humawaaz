import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Image, Modal, ScrollView, Linking, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/timeAgo';
import { MapPin, Search, Filter, AlertTriangle, Plus, Flame, ThumbsUp, ClipboardCheck, X, ImageIcon, Clock, CheckCircle, CheckCircle2, Activity, Check, Users, ExternalLink } from 'lucide-react-native';
import MapView, { Marker } from 'react-native-maps';

interface Complaint {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  department: string;
  upvote_count: number;
  created_at: string;
  photo_url: string | null;
  lat: number | null;
  address: string | null;
  is_urgent: boolean;
  resolution_photo_url: string | null;
}

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

interface Update {
  id: string;
  status: string;
  remark: string;
  created_at: string;
  profiles?: Profile;
}

export default function FeedScreen() {
  const { profile, user } = useAuth();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [ucName, setUcName] = useState<string>('');

  useEffect(() => {
    if (!profile?.uc_id || !user?.id) return;

    fetchComplaints();
    fetchUserVotes();
    
    // Fetch UC Name
    supabase.from('union_councils').select('name').eq('id', profile.uc_id).single()
      .then(({data}) => {
        if (data) setUcName(data.name);
      });

    const channel = supabase
      .channel('public:complaints')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints', filter: `uc_id=eq.${profile.uc_id}` },
        () => {
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.uc_id, user?.id]);

  useEffect(() => {
    if (selectedComplaint) {
      fetchUpdates(selectedComplaint.id);
    }
  }, [selectedComplaint]);

  const handleOpenMaps = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(Location)`
    });
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
        }
      });
    }
  };

  const fetchUpdates = async (complaintId: string) => {
    try {
      const { data, error } = await supabase
        .from('complaint_updates')
        .select('*, profiles(full_name, avatar_url)')
        .eq('complaint_id', complaintId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setUpdates(data || []);
    } catch (err) {
      console.error('Error fetching updates:', err);
    }
  };

  const fetchUserVotes = async () => {
    try {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('complaint_upvotes')
        .select('complaint_id')
        .eq('user_id', user.id);
        
      if (error) throw error;
      setUserVotes(new Set(data.map(v => v.complaint_id)));
    } catch (error) {
      console.error('Error fetching user votes:', error);
    }
  };

  const handleUpvote = async (complaintId: string) => {
    if (!user?.id) return;

    const hasUpvoted = userVotes.has(complaintId);
    
    // Optimistic UI update
    const newVotes = new Set(userVotes);
    if (hasUpvoted) {
      newVotes.delete(complaintId);
    } else {
      newVotes.add(complaintId);
    }
    setUserVotes(newVotes);

    try {
      if (hasUpvoted) {
        await supabase
          .from('complaint_upvotes')
          .delete()
          .match({ complaint_id: complaintId, user_id: user.id });
      } else {
        await supabase
          .from('complaint_upvotes')
          .insert({ complaint_id: complaintId, user_id: user.id });
      }
    } catch (error) {
      console.error('Error toggling upvote:', error);
      fetchUserVotes();
    }
  };

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('id, title, description, status, department, upvote_count, created_at, photo_url, lat, lng, address, is_urgent, resolution_photo_url')
        .eq('uc_id', profile?.uc_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
      case 'acknowledged': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/30';
      default: return 'bg-surface-700 text-surface-300 border-surface-600';
    }
  };

  const renderItem = ({ item }: { item: Complaint }) => (
    <View className="bg-white rounded-3xl overflow-hidden mb-4 shadow-md elevation-3">
      {item.photo_url && (
        <Image 
          source={{ uri: item.photo_url }} 
          className="w-full h-44 bg-gray-100" 
          resizeMode="cover" 
        />
      )}
      <View className="p-4">
        {item.is_urgent && (
          <View className="flex-row items-center gap-1.5 mb-2 bg-red-500/10 self-start px-2 py-1 rounded-md border border-red-500/20">
            <AlertTriangle size={12} color="#ef4444" />
            <Text className="text-red-400 text-[10px] font-bold uppercase">Urgent</Text>
          </View>
        )}
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold text-gray-900" numberOfLines={1}>{item.title}</Text>
            <View className="flex-row items-center mt-2 space-x-2">
              <View className={`px-2.5 py-0.5 rounded-full border ${getStatusColor(item.status)}`}>
                <Text className="text-xs font-bold capitalize">{item.status}</Text>
              </View>
              <Text className="text-gray-500 text-xs">{timeAgo(item.created_at)}</Text>
            </View>
          </View>
        </View>
        <Text className="text-gray-600 text-sm leading-5 mt-1" numberOfLines={2}>
          {item.description}
        </Text>
        
        <View className="mt-4 flex-row items-center justify-between border-t border-gray-100 pt-4 pb-1">
          <View className="flex-row items-center space-x-3">
            <TouchableOpacity 
              className={`flex-row items-center px-4 py-2 rounded-xl border ${userVotes.has(item.id) ? 'bg-[#16a34a] border-[#16a34a]' : 'bg-[#f0fdf4] border-[#bbf7d0]'}`}
              onPress={() => handleUpvote(item.id)}
            >
              <ThumbsUp size={18} color={userVotes.has(item.id) ? "#ffffff" : "#166534"} strokeWidth={2.5} fill={userVotes.has(item.id) ? "#ffffff" : "transparent"} />
              <Text className={`text-sm font-bold ml-2 ${userVotes.has(item.id) ? "text-white" : "text-[#166534]"}`}>
                {item.upvote_count} Upvotes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setSelectedComplaint(item)}
              className="flex-row items-center px-4 py-2 rounded-xl bg-[#f0fdf4] border border-[#bbf7d0]"
            >
              <ClipboardCheck size={18} color="#166534" strokeWidth={2.5} />
              <Text className="text-[#166534] font-bold text-sm ml-2">Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-surface-900 pt-14 px-4">
      <View className="mb-6">
        <Text className="text-3xl font-bold text-surface-100">
          Community Feed
        </Text>
        <View className="flex-row items-center mt-2 bg-surface-800 self-start px-3 py-1.5 rounded-full border border-surface-700">
          <MapPin size={12} color="#4ade80" />
          <Text className="text-surface-200 text-xs font-bold ml-1.5">{ucName || 'Your Area'}</Text>
        </View>
        <Text className="text-surface-400 mt-2 text-sm">
          Recent issues reported in your neighborhood
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : complaints.length === 0 ? (
        <View className="flex-1 justify-center items-center py-10">
          <MapPin size={48} color="#3f3f46" />
          <Text className="text-surface-300 font-medium text-lg mt-4">No complaints yet</Text>
          <Text className="text-surface-500 text-center mt-2 px-8">
            Be the first to report an issue in your neighborhood.
          </Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      {/* Full-Screen Details Modal */}
      <Modal
        visible={!!selectedComplaint}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedComplaint(null)}
      >
        <View className="flex-1 bg-surface-900">
          <ScrollView className="flex-1" bounces={false} showsVerticalScrollIndicator={false}>
            {/* Immersive Header Image (Reduced height) */}
            <View className="w-full h-56 bg-surface-800 relative">
              {selectedComplaint?.photo_url ? (
                <Image 
                  source={{ uri: selectedComplaint.photo_url }} 
                  className="w-full h-full" 
                  resizeMode="cover" 
                />
              ) : (
                <View className="w-full h-full items-center justify-center bg-surface-800">
                  <ImageIcon size={36} color="#52525b" />
                  <Text className="text-surface-500 mt-2 font-medium text-base">No photo attached</Text>
                </View>
              )}
              
              <TouchableOpacity 
                onPress={() => setSelectedComplaint(null)} 
                className="absolute top-12 left-4 w-10 h-10 bg-black/50 rounded-full items-center justify-center border border-white/10"
              >
                <X size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Content Section (Reduced padding) */}
            <View className="px-4 pt-5 pb-24">
              <View className="flex-row items-center mb-3 space-x-2">
                <View className={`px-2.5 py-1 rounded-full border ${getStatusColor(selectedComplaint?.status || '')}`}>
                  <Text className="text-xs font-bold capitalize tracking-wide">{selectedComplaint?.status}</Text>
                </View>
                <View className="bg-surface-800 px-2.5 py-1 rounded-full border border-surface-700">
                  <Text className="text-surface-200 text-xs font-medium capitalize">{selectedComplaint?.department}</Text>
                </View>
              </View>

              <Text className="text-2xl font-bold text-surface-100 mb-2 leading-snug">
                {selectedComplaint?.title}
              </Text>
              
              <View className="flex-row items-center mb-6">
                <MapPin size={14} color="#a1a1aa" className="mr-1" />
                <Text className="text-surface-400 font-medium text-sm">
                  {selectedComplaint ? `Reported ${timeAgo(selectedComplaint.created_at)}` : ''}
                </Text>
              </View>

              <View className="bg-surface-800/40 p-4 rounded-xl border border-surface-700/50 mb-6">
                <Text className="text-surface-200 text-sm leading-6">
                  {selectedComplaint?.description}
                </Text>
              </View>

              {/* Location */}
              {selectedComplaint?.address && selectedComplaint?.lat && selectedComplaint?.lng && (
                <View className="mb-8">
                  <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-surface-100 font-bold text-lg">
                      Location
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <MapPin size={12} color="#4ade80" />
                      <Text className="text-[#4ade80] text-xs font-medium">Auto-detected</Text>
                    </View>
                  </View>
                  
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => handleOpenMaps(selectedComplaint.lat!, selectedComplaint.lng!)}
                    className="bg-surface-800 border border-surface-700 rounded-xl overflow-hidden"
                  >
                    <View className="h-32 w-full relative">
                      <MapView
                        style={{ flex: 1 }}
                        initialRegion={{
                          latitude: selectedComplaint.lat,
                          longitude: selectedComplaint.lng,
                          latitudeDelta: 0.005,
                          longitudeDelta: 0.005,
                        }}
                        pitchEnabled={false}
                        rotateEnabled={false}
                        scrollEnabled={false}
                        zoomEnabled={false}
                      >
                        <Marker coordinate={{ latitude: selectedComplaint.lat, longitude: selectedComplaint.lng }} />
                      </MapView>
                      <View className="absolute top-2 right-2 bg-surface-900/80 px-2 py-1.5 rounded-lg flex-row items-center gap-1.5">
                        <Text className="text-white text-[10px] font-bold">OPEN MAPS</Text>
                        <ExternalLink size={12} color="#fff" />
                      </View>
                    </View>
                    <View className="p-4 flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center">
                        <MapPin size={20} color="#a1a1aa" />
                      </View>
                      <Text className="text-surface-200 text-sm font-medium flex-1">
                        {selectedComplaint.address}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Official Progress Timeline (Redesigned with Flexbox) */}
              <View className="mb-4 bg-surface-800/20 p-5 rounded-2xl border border-surface-800">
                <View className="flex-row items-center mb-6">
                  <Activity size={22} color="#059669" className="mr-2" />
                  <Text className="text-surface-100 text-xl font-bold">Official Progress</Text>
                </View>
                
                <View>
                  
                  {/* Step 1: Reported */}
                  <View className="flex-row">
                    <View className="items-center mr-4">
                      <View className="w-6 h-6 bg-emerald-600 rounded-full items-center justify-center">
                         <Check size={12} color="#fff" strokeWidth={3} />
                      </View>
                      <View className="w-[2px] flex-1 bg-surface-700 mt-1" />
                    </View>
                    <View className="flex-1 pb-8 pt-0.5">
                      <Text className="text-surface-100 font-bold text-base mb-1">Reported</Text>
                      <Text className="text-surface-300 text-sm mb-1.5">Issue submitted by Citizen</Text>
                      <Text className="text-surface-500 text-xs">
                        {selectedComplaint ? new Date(selectedComplaint.created_at).toLocaleString() : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Dynamic Updates */}
                  {updates.map((upd, i) => {
                    const isLast = i === updates.length - 1 && selectedComplaint?.status !== 'resolved';
                    
                    return (
                      <View key={upd.id} className="flex-row">
                        <View className="items-center mr-4">
                          <View className={`w-6 h-6 rounded-full items-center justify-center ${isLast ? 'bg-brand-500' : 'bg-emerald-600'}`}>
                             {isLast ? <Users size={12} color="#fff" /> : <Check size={12} color="#fff" strokeWidth={3} />}
                          </View>
                          {(!isLast || selectedComplaint?.status !== 'resolved') && (
                            <View className="w-[2px] flex-1 bg-surface-700 mt-1" />
                          )}
                        </View>
                        
                        <View className="flex-1 pb-8 pt-0.5">
                          {isLast ? (
                            // Highlighted Card for the active step
                            <View className="bg-surface-800/80 border border-brand-500/30 rounded-xl p-4 shadow-sm -mt-3">
                              <Text className="text-brand-400 font-bold text-base mb-1.5 capitalize">{upd.status}</Text>
                              <Text className="text-surface-200 text-sm leading-5 mb-2.5">{upd.remark}</Text>
                              <View className="flex-row items-center gap-2">
                                {upd.profiles?.avatar_url && (
                                  <Image source={{ uri: upd.profiles.avatar_url }} className="w-5 h-5 rounded-full bg-surface-700" />
                                )}
                                <Text className="text-brand-500/70 text-xs font-medium">
                                  {upd.profiles?.full_name ? `${upd.profiles.full_name} • ` : ''}{new Date(upd.created_at).toLocaleString()}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            // Normal Step
                            <View>
                              <View className="flex-row items-center mb-1">
                                <Text className="text-surface-100 font-bold text-base capitalize mr-2">{upd.status}</Text>
                                <CheckCircle2 size={14} color="#059669" />
                              </View>
                              <Text className="text-surface-300 text-sm mb-1.5 leading-5">{upd.remark}</Text>
                              <View className="flex-row items-center gap-2">
                                {upd.profiles?.avatar_url && (
                                  <Image source={{ uri: upd.profiles.avatar_url }} className="w-5 h-5 rounded-full bg-surface-700" />
                                )}
                                <Text className="text-surface-500 text-xs">
                                  {upd.profiles?.full_name ? `${upd.profiles.full_name} • ` : ''}{new Date(upd.created_at).toLocaleString()}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}

                  {/* Future State: Acknowledged (Only if pending) */}
                  {selectedComplaint?.status === 'pending' && (
                    <View className="flex-row opacity-40">
                      <View className="items-center mr-4">
                        <View className="w-6 h-6 bg-surface-800 rounded-full items-center justify-center border-2 border-surface-600" />
                        <View className="w-[2px] flex-1 bg-surface-700 mt-1" />
                      </View>
                      <View className="flex-1 pb-8 pt-0.5">
                        <Text className="text-surface-400 font-bold text-base mb-1">Acknowledged</Text>
                        <Text className="text-surface-500 text-sm">Awaiting review by UC Official.</Text>
                      </View>
                    </View>
                  )}

                  {/* Future State: Resolved */}
                  {selectedComplaint?.status !== 'resolved' && (
                    <View className="flex-row opacity-40">
                      <View className="items-center mr-4">
                        <View className="w-6 h-6 bg-surface-800 rounded-full items-center justify-center border-2 border-surface-600" />
                      </View>
                      <View className="flex-1 pb-2 pt-0.5">
                        <Text className="text-surface-400 font-bold text-base mb-1">Resolved</Text>
                        <Text className="text-surface-500 text-sm">Awaiting completion.</Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Resolution Photo */}
                  {selectedComplaint?.status === 'resolved' && selectedComplaint?.resolution_photo_url && (
                    <View className="mt-2 mb-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl overflow-hidden shadow-sm">
                      <View className="p-3 border-b border-emerald-500/10 bg-emerald-500/5 flex-row items-center gap-2">
                        <CheckCircle2 size={16} color="#10b981" />
                        <Text className="text-emerald-400 font-bold text-sm">Resolution Proof</Text>
                      </View>
                      <Image 
                        source={{ uri: selectedComplaint.resolution_photo_url }} 
                        className="w-full h-48 bg-surface-800"
                        resizeMode="cover"
                      />
                    </View>
                  )}
                  
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Bottom Action Bar */}
          <View className="px-4 py-4 bg-white border-t border-gray-100 flex-row items-center justify-between shadow-2xl">
            <TouchableOpacity 
              className={`flex-1 flex-row items-center justify-center py-3 rounded-xl mr-3 ${selectedComplaint && userVotes.has(selectedComplaint.id) ? 'bg-[#16a34a]' : 'bg-[#f0fdf4] border border-[#16a34a]/20'}`}
              onPress={() => selectedComplaint && handleUpvote(selectedComplaint.id)}
            >
              <ThumbsUp size={20} color={selectedComplaint && userVotes.has(selectedComplaint.id) ? "#ffffff" : "#166534"} fill={selectedComplaint && userVotes.has(selectedComplaint.id) ? "#ffffff" : "transparent"} strokeWidth={2.5} />
              <Text className={`font-bold ml-2 text-base ${selectedComplaint && userVotes.has(selectedComplaint.id) ? 'text-white' : 'text-[#166534]'}`}>
                {selectedComplaint && userVotes.has(selectedComplaint.id) ? 'Upvoted' : 'Upvote'}
              </Text>
            </TouchableOpacity>
            
            <View className="bg-gray-50 items-center justify-center px-4 py-2 rounded-xl border border-gray-200 min-w-[70px]">
              <Text className="text-gray-500 text-[10px] font-bold uppercase mb-0.5">Total</Text>
              <Text className="text-gray-900 text-lg font-black">{selectedComplaint?.upvote_count}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
