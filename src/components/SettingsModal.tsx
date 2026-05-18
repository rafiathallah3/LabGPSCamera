import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Modal } from 'react-native';
import { X } from 'lucide-react-native';
import { CameraType, FlashMode } from 'expo-camera';
import { TimeFormat } from '../utils/formatters';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  flash: FlashMode;
  onToggleFlash: () => void;
  facing: CameraType;
  onToggleFacing: () => void;
  locationLocked: boolean;
  timeFormat: TimeFormat;
  onToggleTimeFormat: () => void;
  logoPosition: string;
  onCycleLogoPosition: () => void;
  mirrorImage: boolean;
  onToggleMirrorImage: () => void;
}

export function SettingsModal({
  visible,
  onClose,
  flash,
  onToggleFlash,
  facing,
  onToggleFacing,
  locationLocked,
  timeFormat,
  onToggleTimeFormat,
  logoPosition,
  onCycleLogoPosition,
  mirrorImage,
  onToggleMirrorImage,
}: SettingsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.previewOverlay}>
        <SafeAreaView style={styles.settingsHeader}>
          <TouchableOpacity style={styles.settingsHeaderButton} onPress={onClose}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.settingsTitle}>Settings</Text>
          <View style={styles.settingsHeaderButton} />
        </SafeAreaView>

        <View style={styles.settingsContent}>
          <View style={styles.settingsItem}>
            <Text style={styles.settingsLabel}>Flash</Text>
            <TouchableOpacity onPress={onToggleFlash}>
              <Text style={styles.settingsValue}>{flash === 'on' ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsItem}>
            <Text style={styles.settingsLabel}>Camera</Text>
            <TouchableOpacity onPress={onToggleFacing}>
              <Text style={styles.settingsValue}>{facing === 'back' ? 'Rear' : 'Front'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsItem}>
            <Text style={styles.settingsLabel}>GPS Status</Text>
            <Text style={[styles.settingsValue, { color: locationLocked ? '#4ade80' : '#f87171' }]}>
              {locationLocked ? 'Locked' : 'Searching...'}
            </Text>
          </View>
          <View style={styles.settingsItem}>
            <Text style={styles.settingsLabel}>Time Format</Text>
            <TouchableOpacity onPress={onToggleTimeFormat}>
              <Text style={styles.settingsValue}>{timeFormat === '24h' ? '24-Hour' : 'AM/PM'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsItem}>
            <Text style={styles.settingsLabel}>Logo Position</Text>
            <TouchableOpacity onPress={onCycleLogoPosition}>
              <Text style={styles.settingsValue}>{logoPosition.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.settingsItem}>
            <Text style={styles.settingsLabel}>Mirror Image</Text>
            <TouchableOpacity onPress={onToggleMirrorImage}>
              <Text style={[styles.settingsValue, mirrorImage && { color: '#4ade80' }]}>{mirrorImage ? 'On' : 'Off'}</Text>
            </TouchableOpacity>
          </View>
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
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
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
  settingsContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingsLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  settingsValue: {
    color: '#a1a1aa',
    fontSize: 16,
  },
});
