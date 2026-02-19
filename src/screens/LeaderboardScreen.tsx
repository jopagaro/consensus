import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Submission } from '../types';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function LeaderboardScreen() {
  const route = useRoute<any>();
  const { categoryId, categoryName } = route.params ?? {};

  const [entries, setEntries] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    const { data, error } = await supabase
      .from('submissions')
      .select('*, profiles(display_name)')
      .eq('category_id', categoryId)
      .eq('status', 'approved')
      .order('score', { ascending: false })
      .limit(50);

    if (!error && data) {
      setEntries(data);
    }
    setLoading(false);
    setRefreshing(false);
  }, [categoryId]);

  useEffect(() => {
    fetchLeaderboard();

    // Real-time score updates
    const channel = supabase
      .channel(`leaderboard:${categoryId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'submissions', filter: `category_id=eq.${categoryId}` },
        () => fetchLeaderboard()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLeaderboard, categoryId]);

  function renderItem({ item, index }: { item: Submission; index: number }) {
    const medal = MEDAL[index];
    const isTop3 = index < 3;

    return (
      <View style={[styles.row, isTop3 && styles.rowTop]}>
        <Text style={styles.rank}>
          {medal ?? `#${index + 1}`}
        </Text>
        <Image source={{ uri: item.photo_url }} style={styles.thumb} />
        <View style={styles.rowBody}>
          <Text style={styles.name} numberOfLines={1}>
            {item.profiles?.display_name ?? 'Anonymous'}
          </Text>
          {item.caption ? (
            <Text style={styles.caption} numberOfLines={1}>{item.caption}</Text>
          ) : null}
        </View>
        <View style={styles.scoreBox}>
          <Text style={[styles.score, item.score >= 0 ? styles.pos : styles.neg]}>
            {item.score >= 0 ? '+' : ''}{item.score}
          </Text>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchLeaderboard(); }}
            tintColor="#6C63FF"
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{categoryName}</Text>
            <Text style={styles.headerSub}>Live Rankings · Updates in real time</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No entries yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
    marginTop: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  headerSub: {
    fontSize: 13,
    color: '#555',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#222',
  },
  rowTop: {
    borderColor: '#6C63FF44',
    backgroundColor: '#1a1828',
  },
  rank: {
    width: 36,
    fontSize: 20,
    textAlign: 'center',
    color: '#fff',
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    marginHorizontal: 12,
    backgroundColor: '#333',
  },
  rowBody: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  caption: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },
  scoreBox: {
    alignItems: 'center',
    minWidth: 48,
  },
  score: {
    fontSize: 20,
    fontWeight: '800',
  },
  pos: {
    color: '#34C759',
  },
  neg: {
    color: '#FF3B30',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#555',
    marginTop: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#555',
    fontSize: 16,
  },
});
