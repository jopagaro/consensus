import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  PanResponder,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Submission } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function SwipeScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { categoryId, categoryName } = route.params;

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voteCount, setVoteCount] = useState(0);

  const position = useRef(new Animated.ValueXY()).current;
  const swipeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchSubmissions();
  }, []);

  async function fetchSubmissions() {
    const { data, error } = await supabase
      .from('submissions')
      .select('*, profiles(display_name)')
      .eq('category_id', categoryId)
      .eq('status', 'approved')
      .order('created_at');

    if (!error && data) {
      // Shuffle so every voter sees a different order
      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setSubmissions(shuffled);
    }
    setLoading(false);
  }

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      position.setValue({ x: gestureState.dx, y: gestureState.dy });
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > SWIPE_THRESHOLD) {
        swipeOut('right');
      } else if (gestureState.dx < -SWIPE_THRESHOLD) {
        swipeOut('left');
      } else {
        resetPosition();
      }
    },
  });

  function resetPosition() {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  }

  async function swipeOut(direction: 'left' | 'right') {
    const value = direction === 'right' ? 1 : -1;
    const x = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      recordVote(value);
    });
  }

  async function recordVote(value: 1 | -1) {
    const current = submissions[currentIndex];
    if (!current) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Insert vote (DB unique constraint prevents duplicates)
    await supabase.from('votes').insert({
      submission_id: current.id,
      voter_id: user.id,
      value,
    });

    // Update the submission score
    await supabase.rpc('update_submission_score', {
      p_submission_id: current.id,
      p_delta: value,
    });

    position.setValue({ x: 0, y: 0 });
    setCurrentIndex((prev) => prev + 1);
    setVoteCount((prev) => prev + 1);
  }

  function handleYes() {
    swipeOut('right');
  }

  function handleNo() {
    swipeOut('left');
  }

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-8deg', '0deg', '8deg'],
  });

  const yesOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_WIDTH / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const noOpacity = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C63FF" size="large" />
      </View>
    );
  }

  const current = submissions[currentIndex];
  const next = submissions[currentIndex + 1];

  if (!current) {
    return (
      <View style={styles.centered}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>You've seen them all!</Text>
        <Text style={styles.doneSubtitle}>You cast {voteCount} votes</Text>
        <TouchableOpacity
          style={styles.leaderboardBtn}
          onPress={() => navigation.navigate('Leaderboard', { categoryId, categoryName })}
        >
          <Text style={styles.leaderboardBtnText}>See Leaderboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>
        {currentIndex + 1} / {submissions.length}
      </Text>

      {/* Next card (rendered behind) */}
      {next && (
        <View style={[styles.card, styles.cardBehind]}>
          <Image source={{ uri: next.photo_url }} style={styles.cardImage} />
        </View>
      )}

      {/* Current card */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateX: position.x },
              { translateY: position.y },
              { rotate },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* Yes overlay */}
        <Animated.View style={[styles.overlay, styles.yesOverlay, { opacity: yesOpacity }]}>
          <Text style={styles.overlayText}>YES ✓</Text>
        </Animated.View>

        {/* No overlay */}
        <Animated.View style={[styles.overlay, styles.noOverlay, { opacity: noOpacity }]}>
          <Text style={styles.overlayText}>NOPE ✗</Text>
        </Animated.View>

        <Image source={{ uri: current.photo_url }} style={styles.cardImage} />

        {current.caption ? (
          <View style={styles.captionBar}>
            <Text style={styles.captionText}>{current.caption}</Text>
          </View>
        ) : null}
      </Animated.View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.btn, styles.noBtn]} onPress={handleNo}>
          <Text style={styles.btnText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.yesBtn]} onPress={handleYes}>
          <Text style={styles.btnText}>♥</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>Swipe right to vote yes · left to vote no</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  counter: {
    color: '#444',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 12,
  },
  card: {
    position: 'absolute',
    top: 60,
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.62,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  cardBehind: {
    top: 68,
    transform: [{ scale: 0.96 }],
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 32,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 3,
  },
  yesOverlay: {
    left: 20,
    borderColor: '#34C759',
    backgroundColor: '#34C75933',
  },
  noOverlay: {
    right: 20,
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B3033',
  },
  overlayText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  captionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 16,
  },
  captionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  buttons: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    gap: 48,
  },
  btn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  noBtn: {
    backgroundColor: '#FF3B30',
  },
  yesBtn: {
    backgroundColor: '#34C759',
  },
  btnText: {
    fontSize: 28,
    color: '#fff',
  },
  hint: {
    position: 'absolute',
    bottom: 52,
    color: '#333',
    fontSize: 12,
  },
  doneEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  doneSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  leaderboardBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  leaderboardBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
