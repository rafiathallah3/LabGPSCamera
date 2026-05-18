import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Modal, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Trash2, Share2, Grid } from 'lucide-react-native';
import { formatDateTime, TimeFormat } from '../utils/formatters';

interface PhotoPreviewModalProps {
  visible: boolean;
  onClose: () => void;
  photoUri: string | null;
  photoTimestamp: number | null;
  timeFormat: TimeFormat;
  onDelete: () => void;
  onShare: () => void;
  onOpenGallery: () => void;
}

export function PhotoPreviewModal({
  visible,
  onClose,
  photoUri,
  photoTimestamp,
  timeFormat,
  onDelete,
  onShare,
  onOpenGallery,
}: PhotoPreviewModalProps) {
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

        <View style={styles.previewImageWrapper}>
          {photoUri && (
            <Image
              source={{ uri: photoUri }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          )}
        </View>

        <SafeAreaView style={styles.previewHeaderOverlay}>
          <View style={styles.previewHeaderRow}>
            <TouchableOpacity style={styles.previewBackButton} onPress={onClose}>
              <ChevronLeft size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.previewDateTime}>
              {formatDateTime(photoTimestamp || Date.now(), timeFormat)}
            </Text>
          </View>
        </SafeAreaView>

        <View style={styles.previewActionsOverlay}>
          <TouchableOpacity style={styles.previewActionButton} onPress={onDelete}>
            <Trash2 size={22} color="#f87171" />
            <Text style={[styles.previewActionText, { color: '#f87171' }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.previewActionButton} onPress={onShare}>
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
    paddingTop: 12,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewDateTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  previewImageWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 3 / 4,
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
