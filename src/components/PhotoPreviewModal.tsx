import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Modal,
  Image,
  Dimensions,
  FlatList,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Trash2, Share2, Grid } from 'lucide-react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { formatDateTime, TimeFormat } from '../utils/formatters';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PhotoPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  photos: MediaLibrary.Asset[];
  initialIndex: number;
  timeFormat: TimeFormat;
  onDeleteAsset: (asset: MediaLibrary.Asset) => Promise<void>;
  onOpenGallery: () => void;
  fallbackPhotoUri?: string | null;
  fallbackPhotoTimestamp?: number | null;
}

export function PhotoPreviewModal({
  visible,
  onClose,
  photos,
  initialIndex,
  timeFormat,
  onDeleteAsset,
  onOpenGallery,
  fallbackPhotoUri,
  fallbackPhotoTimestamp,
}: PhotoPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible) {
      const safeIndex = initialIndex >= 0 && initialIndex < photos.length ? initialIndex : 0;
      setCurrentIndex(safeIndex);
      setTimeout(() => {
        if (flatListRef.current && photos.length > 0) {
          try {
            flatListRef.current.scrollToIndex({ index: safeIndex, animated: false });
          } catch (e) {
            // Safe fallback if not yet measured
          }
        }
      }, 50);
    }
  }, [visible, initialIndex, photos.length]);

  const currentPhoto = photos.length > 0 ? photos[currentIndex] : null;
  const currentTimestamp = currentPhoto?.creationTime || fallbackPhotoTimestamp || Date.now();

  const handleShare = async () => {
    try {
      if (currentPhoto) {
        const info = await MediaLibrary.getAssetInfoAsync(currentPhoto);
        await Sharing.shareAsync(info.localUri || currentPhoto.uri);
      } else if (fallbackPhotoUri) {
        await Sharing.shareAsync(fallbackPhotoUri);
      }
    } catch (err) {
      console.warn('Failed to share:', err);
    }
  };

  const handleDelete = async () => {
    if (currentPhoto) {
      await onDeleteAsset(currentPhoto);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.previewOverlay}>
        <StatusBar style="light" />

        {/* Horizontal FlatList for Swiping Between Photos */}
        {photos.length > 0 ? (
          <FlatList
            ref={flatListRef}
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={initialIndex >= 0 && initialIndex < photos.length ? initialIndex : 0}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              if (newIndex >= 0 && newIndex < photos.length) {
                setCurrentIndex(newIndex);
              }
            }}
            renderItem={({ item }) => (
              <View style={styles.slideWrapper}>
                <Image
                  source={{ uri: item.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        ) : (
          <View style={styles.previewImageWrapper}>
            {fallbackPhotoUri && (
              <Image
                source={{ uri: fallbackPhotoUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )}
          </View>
        )}

        {/* Top Header Overlay */}
        <SafeAreaView style={styles.previewHeaderOverlay}>
          <View style={styles.previewHeaderRow}>
            <TouchableOpacity style={styles.previewBackButton} onPress={onClose}>
              <ChevronLeft size={26} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerInfoContainer}>
              <Text style={styles.previewDateTime}>
                {formatDateTime(currentTimestamp, timeFormat)}
              </Text>
              {photos.length > 1 && (
                <Text style={styles.counterText}>
                  {currentIndex + 1} of {photos.length}
                </Text>
              )}
            </View>
          </View>
        </SafeAreaView>

        {/* Bottom Actions Overlay */}
        <View style={styles.previewActionsOverlay}>
          <TouchableOpacity style={styles.previewActionButton} onPress={handleDelete}>
            <Trash2 size={22} color="#f87171" />
            <Text style={[styles.previewActionText, { color: '#f87171' }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewActionButton} onPress={handleShare}>
            <Share2 size={22} color="#fff" />
            <Text style={styles.previewActionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewActionButton} onPress={onOpenGallery}>
            <Grid size={22} color="#fff" />
            <Text style={styles.previewActionText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  previewOverlay: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 12 : 12,
    paddingHorizontal: 16,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    gap: 12,
  },
  previewBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfoContainer: {
    flexDirection: 'column',
    gap: 2,
  },
  previewDateTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  counterText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  slideWrapper: {
    width: SCREEN_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  previewImageWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActionsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 40,
    paddingTop: 16,
    gap: 20,
    zIndex: 10,
  },
  previewActionButton: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    minWidth: 80,
  },
  previewActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});
