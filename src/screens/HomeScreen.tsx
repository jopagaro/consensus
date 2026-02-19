import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Category, CategoryStatus } from '../types';

const STATUS_LABEL: Record<CategoryStatus, string> = {
  upcoming: 'Coming Soon',
  submission: 'Submit Now',
  voting: 'Voting Open',
  closed: 'Closed',
};

const STATUS_COLOR: Record<CategoryStatus, string> = {
  upcoming: '#555',
  submission: '#FF9500',
  voting: '#34C759',
  closed: '#3a3a3a',
};

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCategories(data);
    }
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  function renderItem({ item }: { item: Category }) {
    const isVoting = item.status === 'voting';
    const isSubmission = item.status === 'submission';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          if (isVoting) {
            navigation.navigate('Swipe', { categoryId: item.id, categoryName: item.name });
          } else if (isSubmission) {
            navigation.navigate('Submit', { categoryId: item.id, categoryName: item.name });
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.emoji}>{item.emoji}</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLOR[item.status] + '33' }]}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLOR[item.status] }]} />
            <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
              {STATUS_LABEL[item.status]}
            </Text>
          </View>
        </View>
        {(isVoting || isSubmission) && (
          <Text style={styles.arrow}>›</Text>
        )}
      </TouchableOpacity>
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
        data={categories}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchCategories(); }}
            tintColor="#6C63FF"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No categories yet.</Text>
            <Text style={styles.emptySubtext}>Check back soon!</Text>
          </View>
        }
        ListHeaderComponent={
          <Text style={styles.sectionHeader}>Active Categories</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  emoji: {
    fontSize: 40,
    marginRight: 16,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  arrow: {
    color: '#444',
    fontSize: 28,
    marginLeft: 8,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#555',
    fontSize: 14,
    marginTop: 8,
  },
});
