import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Category } from '../types';

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function compute() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Closed');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else setTimeLeft(`${h}h ${m}m ${s}s`);
    }
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function CategoryCard({ category }: { category: Category }) {
  const navigation = useNavigation<any>();
  const countdown = useCountdown(
    category.status === 'submission' ? category.submission_end : category.voting_end
  );

  const isSubmission = category.status === 'submission';
  const isVoting = category.status === 'voting';

  function handlePress() {
    if (isSubmission) {
      navigation.navigate('Submit', {
        categoryId: category.id,
        categoryName: category.name,
      });
    } else if (isVoting) {
      navigation.navigate('Tabs', {
        categoryId: category.id,
        categoryName: category.name,
      });
    }
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handlePress}
      activeOpacity={0.85}
      disabled={!isSubmission && !isVoting}
    >
      <View style={styles.cardTop}>
        <Text style={styles.emoji}>{category.emoji}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardTitle}>{category.name}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>
            {category.description}
          </Text>
        </View>
      </View>

      <View style={styles.timerRow}>
        {isSubmission && (
          <>
            <View style={styles.timerLabelRow}>
              <View style={[styles.pulseDot, { backgroundColor: '#FF9500' }]} />
              <Text style={styles.timerLabel}>Submissions close in</Text>
            </View>
            <Text style={[styles.timer, { color: '#FF9500' }]}>{countdown}</Text>
          </>
        )}
        {isVoting && (
          <>
            <View style={styles.timerLabelRow}>
              <View style={[styles.pulseDot, { backgroundColor: '#34C759' }]} />
              <Text style={styles.timerLabel}>Voting ends in</Text>
            </View>
            <Text style={[styles.timer, { color: '#34C759' }]}>{countdown}</Text>
          </>
        )}
        {!isSubmission && !isVoting && (
          <Text style={styles.closedText}>
            {category.status === 'upcoming' ? 'Opening soon' : 'Competition closed'}
          </Text>
        )}
      </View>

      {(isSubmission || isVoting) && (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            {isSubmission ? 'Submit your entry →' : 'Vote now →'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function LandingScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('categories')
      .select('*')
      .in('status', ['submission', 'voting', 'upcoming'])
      .order('created_at')
      .then(({ data }) => {
        if (data) setCategories(data);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logo}>Consensus</Text>
        <Text style={styles.tagline}>The world decides.</Text>
      </View>

      {categories.map((cat) => (
        <CategoryCard key={cat.id} category={cat} />
      ))}

      {categories.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No active categories.</Text>
          <Text style={styles.emptySub}>Check back soon!</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: 16,
    marginBottom: 32,
  },
  logo: {
    fontSize: 38,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    color: '#555',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#131313',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 44,
    marginRight: 14,
    lineHeight: 52,
  },
  cardMeta: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  timerRow: {
    marginBottom: 16,
  },
  timerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },
  timerLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timer: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closedText: {
    color: '#444',
    fontSize: 14,
  },
  cta: {
    backgroundColor: '#6C63FF22',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6C63FF55',
  },
  ctaText: {
    color: '#6C63FF',
    fontWeight: '700',
    fontSize: 15,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySub: {
    color: '#444',
    fontSize: 14,
    marginTop: 8,
  },
});
