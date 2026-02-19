import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

export default function SubmitScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { categoryId, categoryName } = route.params;

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'We need access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  }

  async function submit() {
    if (!imageUri) {
      Alert.alert('No photo', 'Please select or take a photo first.');
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Upload photo to Supabase Storage
      const ext = imageUri.split('.').pop() ?? 'jpg';
      const fileName = `${user.id}-${Date.now()}.${ext}`;
      const filePath = `submissions/${categoryId}/${fileName}`;

      const response = await fetch(imageUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, blob, { contentType: `image/${ext}` });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      // Create submission record
      const { error: insertError } = await supabase.from('submissions').insert({
        category_id: categoryId,
        user_id: user.id,
        photo_url: publicUrl,
        caption: caption.trim() || null,
        score: 0,
        status: 'approved', // auto-approved for MVP testing
      });

      if (insertError) throw insertError;

      Alert.alert(
        'Submitted! 🎉',
        "Your entry is under review. We'll approve it shortly.",
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Something went wrong. Try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Submit to</Text>
      <Text style={styles.categoryName}>{categoryName}</Text>

      {/* Photo picker */}
      {imageUri ? (
        <TouchableOpacity onPress={pickImage} activeOpacity={0.9}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <Text style={styles.changePhoto}>Tap to change photo</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.photoButtons}>
          <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
            <Text style={styles.photoBtnIcon}>📷</Text>
            <Text style={styles.photoBtnText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoBtn} onPress={pickImage}>
            <Text style={styles.photoBtnIcon}>🖼</Text>
            <Text style={styles.photoBtnText}>Choose from Library</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Caption */}
      <Text style={styles.label}>Caption (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Add a caption..."
        placeholderTextColor="#555"
        value={caption}
        onChangeText={setCaption}
        maxLength={100}
        multiline
      />
      <Text style={styles.charCount}>{caption.length}/100</Text>

      {/* Rules reminder */}
      <View style={styles.rules}>
        <Text style={styles.rulesTitle}>Submission rules</Text>
        <Text style={styles.rulesText}>• Photo must fit the category theme</Text>
        <Text style={styles.rulesText}>• No heavy filters or edits</Text>
        <Text style={styles.rulesText}>• One submission per person per category</Text>
        <Text style={styles.rulesText}>• Entries are reviewed before going live</Text>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, (!imageUri || uploading) && styles.submitDisabled]}
        onPress={submit}
        disabled={!imageUri || uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Submit Entry</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 24,
    paddingBottom: 60,
  },
  title: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryName: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 28,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  photoBtnIcon: {
    fontSize: 32,
  },
  photoBtnText: {
    color: '#888',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  preview: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: 16,
    marginBottom: 8,
    backgroundColor: '#1a1a1a',
  },
  changePhoto: {
    color: '#6C63FF',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  label: {
    color: '#888',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#161616',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    color: '#444',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 24,
  },
  rules: {
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  rulesTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  rulesText: {
    color: '#555',
    fontSize: 13,
    lineHeight: 22,
  },
  submitBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
