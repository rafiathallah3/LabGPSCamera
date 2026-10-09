import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Modal, Platform, StatusBar as RNStatusBar } from 'react-native';
import { X, ChevronDown, ChevronUp, Check } from 'lucide-react-native';
import { CameraType, FlashMode } from 'expo-camera';
import { TimeFormat } from '../utils/formatters';

export type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

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
  logoPosition: LogoPosition;
  onSelectLogoPosition: (position: LogoPosition) => void;
  onCycleLogoPosition?: () => void;
  mirrorImage: boolean;
  onToggleMirrorImage: () => void;
}

const LOGO_POSITIONS: { value: LogoPosition; label: string }[] = [
  { value: 'top-left', label: 'Top-Left' },
  { value: 'top-right', label: 'Top-Right' },
  { value: 'bottom-left', label: 'Bottom-Left' },
  { value: 'bottom-right', label: 'Bottom-Right' },
];

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
  onSelectLogoPosition,
  mirrorImage,
  onToggleMirrorImage,
}: SettingsModalProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const formatLogoLabel = (pos: LogoPosition) => {
    const found = LOGO_POSITIONS.find(p => p.value === pos);
    return found ? found.label : pos;
  };

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
          {/* Flash */}
          <TouchableOpacity style={styles.settingsItem} onPress={onToggleFlash} activeOpacity={0.7}>
            <Text style={styles.settingsLabel}>Flash</Text>
            <Text style={styles.settingsValue}>{flash === 'on' ? 'On' : 'Off'}</Text>
          </TouchableOpacity>

          {/* Camera */}
          <TouchableOpacity style={styles.settingsItem} onPress={onToggleFacing} activeOpacity={0.7}>
            <Text style={styles.settingsLabel}>Camera</Text>
            <Text style={styles.settingsValue}>{facing === 'back' ? 'Rear' : 'Front'}</Text>
          </TouchableOpacity>

          {/* GPS Status */}
          <View style={styles.settingsItem}>
            <Text style={styles.settingsLabel}>GPS Status</Text>
            <Text style={[styles.settingsValue, { color: locationLocked ? '#4ade80' : '#f87171' }]}>
              {locationLocked ? 'Locked' : 'Searching...'}
            </Text>
          </View>

          {/* Time Format */}
          <TouchableOpacity style={styles.settingsItem} onPress={onToggleTimeFormat} activeOpacity={0.7}>
            <Text style={styles.settingsLabel}>Time Format</Text>
            <Text style={styles.settingsValue}>{timeFormat === '24h' ? '24-Hour' : 'AM/PM'}</Text>
          </TouchableOpacity>

          {/* Logo Position with Dropdown */}
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => setDropdownOpen(open => !open)}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsLabel}>Logo Position</Text>
              <View style={styles.dropdownHeaderRight}>
                <Text style={styles.settingsValue}>{formatLogoLabel(logoPosition)}</Text>
                {dropdownOpen ? (
                  <ChevronUp size={18} color="#a1a1aa" />
                ) : (
                  <ChevronDown size={18} color="#a1a1aa" />
                )}
              </View>
            </TouchableOpacity>

            {dropdownOpen && (
              <View style={styles.dropdownMenu}>
                {LOGO_POSITIONS.map(item => {
                  const isSelected = item.value === logoPosition;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.dropdownMenuItem, isSelected && styles.dropdownMenuItemActive]}
                      onPress={() => {
                        onSelectLogoPosition(item.value);
                        setDropdownOpen(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.dropdownMenuText, isSelected && styles.dropdownMenuTextActive]}>
                        {item.label}
                      </Text>
                      {isSelected && <Check size={18} color="#4ade80" />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Mirror Image */}
          <TouchableOpacity style={styles.settingsItem} onPress={onToggleMirrorImage} activeOpacity={0.7}>
            <Text style={styles.settingsLabel}>Mirror Image</Text>
            <Text style={[styles.settingsValue, mirrorImage && { color: '#4ade80' }]}>
              {mirrorImage ? 'On' : 'Off'}
            </Text>
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
  settingsContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
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
  dropdownContainer: {
    borderBottomWidth: 0,
  },
  dropdownHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownMenu: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownMenuItemActive: {
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
  },
  dropdownMenuText: {
    color: '#d4d4d8',
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownMenuTextActive: {
    color: '#4ade80',
    fontWeight: '600',
  },
});
