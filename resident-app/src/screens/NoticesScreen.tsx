import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { timeAgo } from '../utils/timeAgo';
import { Bell, Megaphone } from 'lucide-react-native';

interface Notice {
  id: string;
  type: 'announcement' | 'civic_request';
  title: string;
  body: string;
  created_at: string;
}

export default function NoticesScreen() {
  const { profile } = useAuth();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.uc_id) return;

    fetchNotices();

    const channel = supabase
      .channel('public:announcements')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements', filter: `uc_id=eq.${profile.uc_id}` },
        () => fetchNotices()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.uc_id]);

  const fetchNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, type, title, body, created_at')
        .eq('uc_id', profile?.uc_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
    } catch (error) {
      console.error('Error fetching notices:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: Notice }) => {
    const isAnnouncement = item.type === 'announcement';
    return (
      <View className="bg-surface-800 border border-surface-700 rounded-2xl p-5 mb-4 relative overflow-hidden">
        {/* Accent Top Border */}
        <View className={`absolute top-0 left-0 right-0 h-1 ${isAnnouncement ? 'bg-brand-500' : 'bg-amber-500'}`} />
        
        <View className="flex-row items-center mb-3 mt-1">
          <View className={`p-2 rounded-lg mr-3 ${isAnnouncement ? 'bg-brand-500/20' : 'bg-amber-500/20'}`}>
            {isAnnouncement ? (
              <Megaphone size={16} color="#4ade80" /> // brand-400
            ) : (
              <Bell size={16} color="#fbbf24" /> // amber-400
            )}
          </View>
          <View className="flex-1">
            <Text className={`text-xs font-bold uppercase tracking-wider ${isAnnouncement ? 'text-brand-400' : 'text-amber-400'}`}>
              {isAnnouncement ? 'Official Announcement' : 'Civic Request'}
            </Text>
            <Text className="text-surface-400 text-xs mt-0.5">{timeAgo(item.created_at)}</Text>
          </View>
        </View>
        
        <Text className="text-xl font-bold text-surface-100 mb-2">{item.title}</Text>
        <Text className="text-surface-300 text-base leading-6">{item.body}</Text>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-surface-900 pt-14 px-4">
      <View className="mb-6">
        <Text className="text-3xl font-bold text-surface-100">Notice Board</Text>
        <Text className="text-surface-400">Updates from your Union Council office</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4ade80" />
        </View>
      ) : notices.length === 0 ? (
        <View className="flex-1 justify-center items-center py-10">
          <Bell size={48} color="#3f3f46" />
          <Text className="text-surface-300 font-medium text-lg mt-4">No notices yet</Text>
          <Text className="text-surface-500 text-center mt-2 px-8">
            Your Chairman hasn't posted any announcements. Check back later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}
    </View>
  );
}
