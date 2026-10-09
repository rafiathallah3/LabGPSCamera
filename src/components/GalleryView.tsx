import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, FlatList, Image, Platform, StatusBar as RNStatusBar } from 'react-native';
import { ChevronLeft, Image as ImageIcon } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';

interface GalleryViewProps {
  visible: boolean;
  onClose: () => void;
  photos: MediaLibrary.Asset[];
  onOpenPhoto: (asset: MediaLibrary.Asset, index: number) => void;
}

export function GalleryView({ visible, onClose, photos, onOpenPhoto }: GalleryViewProps) {
  if (!visible) return null;

  return (
    <View style={styles.galleryOverlay}>
      <SafeAreaView style={styles.settingsHeader}>
        <TouchableOpacity style={styles.settingsHeaderButton} onPress={onClose}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.settingsTitle}>Gallery</Text>
        <View style={styles.settingsHeaderButton} />
      </SafeAreaView>

      <FlatList
        data={photos}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.galleryGrid}
        renderItem={({ item, index }) => (
          <TouchableOpacity style={styles.galleryItem} onPress={() => onOpenPhoto(item, index)}>
            <Image source={{ uri: item.uri }} style={styles.galleryThumb} resizeMode="cover" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.galleryEmpty}>
            <ImageIcon size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.galleryEmptyText}>No photos yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 200,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 12 : 12,
    paddingBottom: 12,
  },
  settingsHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  galleryGrid: {
    padding: 2,
  },
  galleryItem: {
    flex: 1 / 3,
    aspectRatio: 1,
    padding: 2,
  },
  galleryThumb: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  galleryEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    gap: 12,
  },
  galleryEmptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
  },
});
