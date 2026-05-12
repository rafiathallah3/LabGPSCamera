import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Image,
  Alert,
  Animated,
  StatusBar as RNStatusBar
} from 'react-native';
import { CameraView, useCameraPermissions, FlashMode, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
  Camera as CameraIcon,
  RefreshCw,
  Zap,
  ZapOff,
  MapPin,
  Navigation,
  Image as ImageIcon,
  Share2,
  CheckCircle2,
  XCircle
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import ViewShot from 'react-native-view-shot';

import { useLocation } from './src/hooks/useLocation';
import { formatCoordinate, formatAltitude, formatDateTime } from './src/utils/formatters';

const { width, height } = Dimensions.get('window');

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const { location, errorMsg, loading: locationLoading } = useLocation();

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      if (permission && !permission.granted) {
        await requestPermission();
      }
      if (mediaPermission && !mediaPermission.granted) {
        await requestMediaPermission();
      }
    })();
  }, [permission, mediaPermission]);

  if (!permission) {
    // Camera permissions are still loading.
    return <View style={styles.centered}><Text>Loading Camera...</Text></View>;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const toggleFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  const capturePhoto = async () => {
    if (isCapturing || !viewShotRef.current) return;

    setIsCapturing(true);

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start();

    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) throw new Error("Capture returned no URI");

      setLastPhoto(uri);

      if (mediaPermission?.granted) {
        await MediaLibrary.saveToLibraryAsync(uri);
      }

      setIsCapturing(false);
    } catch (error) {
      console.error('Capture failed', error);
      setIsCapturing(false);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const sharePhoto = async () => {
    if (lastPhoto) {
      await Sharing.shareAsync(lastPhoto);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <RNStatusBar barStyle="light-content" />

      {/* Camera View wrapped in ViewShot for watermarking */}
      <ViewShot
        ref={viewShotRef}
        options={{ format: "jpg", quality: 0.9 }}
        style={styles.cameraContainer}
      >
        <CameraView
          style={styles.camera}
          facing={facing}
          flash={flash}
        >
          {/* Top Info Bar */}
          <SafeAreaView style={styles.topBar}>
            <BlurView intensity={30} tint="dark" style={styles.statusBadge}>
              <MapPin size={14} color={location ? "#4ade80" : "#f87171"} strokeWidth={3} />
              <Text style={styles.statusText}>
                {locationLoading ? "Searching GPS..." : (location ? "GPS LOCKED" : "GPS ERROR")}
              </Text>
            </BlurView>
          </SafeAreaView>

          {/* Bottom GPS Watermark Overlay */}
          <View style={styles.watermarkContainer}>
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.watermarkGradient}
            >
              <View style={styles.watermarkContent}>
                <View style={styles.watermarkLeft}>
                  <View style={styles.coordRow}>
                    <Navigation size={16} color="#fff" style={styles.iconShadow} />
                    <Text style={styles.coordText}>
                      {location ? formatCoordinate(location.latitude, true) : "00°00'00\" N"}
                    </Text>
                  </View>
                  <View style={styles.coordRow}>
                    <View style={{ width: 16 }} />
                    <Text style={styles.coordText}>
                      {location ? formatCoordinate(location.longitude, false) : "00°00'00\" E"}
                    </Text>
                  </View>
                </View>

                <View style={styles.watermarkRight}>
                  <Text style={styles.altText}>
                    ALT: {location ? formatAltitude(location.altitude) : "---"}
                  </Text>
                  <Text style={styles.dateText}>
                    {formatDateTime(location?.timestamp || Date.now())}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        </CameraView>
      </ViewShot>

      {/* Capture Animation Overlay */}
      <Animated.View
        style={[
          styles.flashOverlay,
          { opacity: flashAnim }
        ]}
        pointerEvents="none"
      />

      {/* UI Controls Overlay (Not captured by ViewShot) */}
      <SafeAreaView style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Gallery / Last Photo */}
          <TouchableOpacity
            style={styles.sideButton}
            onPress={sharePhoto}
            disabled={!lastPhoto}
          >
            {lastPhoto ? (
              <Image source={{ uri: lastPhoto }} style={styles.previewImage} />
            ) : (
              <ImageIcon size={24} color="#fff" />
            )}
            {lastPhoto && (
              <View style={styles.shareBadge}>
                <Share2 size={10} color="#000" strokeWidth={3} />
              </View>
            )}
          </TouchableOpacity>

          {/* Main Capture Button */}
          <TouchableOpacity
            style={styles.captureButtonOuter}
            onPress={capturePhoto}
            disabled={isCapturing}
          >
            <LinearGradient
              colors={['#fff', '#e2e8f0']}
              style={styles.captureButtonInner}
            >
              <View style={styles.captureButtonCore} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Flip Camera */}
          <TouchableOpacity style={styles.sideButton} onPress={toggleFacing}>
            <RefreshCw size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Settings Bar */}
        <View style={styles.settingsBar}>
          <TouchableOpacity style={styles.settingIcon} onPress={toggleFlash}>
            {flash === 'on' ? (
              <Zap size={20} color="#fbbf24" fill="#fbbf24" />
            ) : (
              <ZapOff size={20} color="#fff" opacity={0.6} />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Error Toast */}
      {errorMsg && (
        <View style={styles.errorToast}>
          <XCircle size={16} color="#f87171" />
          <Text style={styles.errorToastText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  watermarkContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  watermarkGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  watermarkContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  watermarkLeft: {
    gap: 2,
  },
  watermarkRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coordText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  altText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.9,
  },
  dateText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.7,
  },
  iconShadow: {
    shadowColor: 'rgba(0,0,0,0.5)',
    shadowOffset: { width: 1, height: 1 },
    shadowRadius: 3,
    shadowOpacity: 0.5,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 100,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  sideButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  captureButtonOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#000',
    backgroundColor: 'transparent',
    opacity: 0.1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  shareBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#fff',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 30,
  },
  settingIcon: {
    padding: 8,
  },
  permissionText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    paddingHorizontal: 40,
  },
  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#000',
    fontWeight: '700',
  },
  errorToast: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    backgroundColor: 'rgba(248,113,113,0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  errorToastText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  }
});
