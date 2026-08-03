import React, { useState, useRef, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  Modal,
  Platform,
  StatusBar as RNStatusBar,
  FlatList,
  PixelRatio
} from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { CameraView, useCameraPermissions, FlashMode, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as NavigationBar from 'expo-navigation-bar';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  RefreshCw,
  Zap,
  ZapOff,
  MapPin,
  Image as ImageIcon,
  Share2,
  XCircle,
  X,
  Settings,
  ChevronLeft,
  Trash2,
  Grid
} from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import ViewShot from 'react-native-view-shot';

import { useLocation } from './src/hooks/useLocation';
import { formatDateTime, TimeFormat } from './src/utils/formatters';
import { getMapTile } from './src/utils/mapTile';
import { PhotoPreviewModal } from './src/components/PhotoPreviewModal';
import { GalleryView } from './src/components/GalleryView';
import { SettingsModal } from './src/components/SettingsModal';

const APP_ALBUM_NAME = 'IFLab GPS Camera';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tipe orientasi perangkat berdasarkan kemiringan fisik
type DeviceOrientation = 'portrait' | 'landscape-left' | 'landscape-right' | 'upside-down';

// Memastikan foto hasil tangkapan selalu dalam orientasi portrait yang benar
const normalizePhotoOrientation = async (
  uri: string,
  orientation: DeviceOrientation,
  exif?: any,
  width?: number,
  height?: number
): Promise<string> => {
  try {
    let rotateAngle = 0;

    // Tentukan rotasi berdasarkan orientasi fisik perangkat saat mengambil foto
    if (orientation === 'landscape-left') {
      rotateAngle = 270;
    } else if (orientation === 'landscape-right') {
      rotateAngle = 90;
    } else if (orientation === 'upside-down') {
      rotateAngle = 180;
    } else if (orientation === 'portrait') {
      // Dalam mode portrait, foto dari kamera sudah dalam orientasi portrait yang benar
      rotateAngle = 0;
    }

    if (rotateAngle !== 0) {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ rotate: rotateAngle }],
        { format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
      );
      return result.uri;
    }

    return uri;
  } catch (err) {
    console.warn('Failed to normalize photo orientation:', err);
    return uri;
  }
};

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const { location, address, errorMsg, loading: locationLoading } = useLocation();

  // Orientasi fisik perangkat via akselerometer (layar tetap terkunci portrait)
  const [deviceOrientation, setDeviceOrientation] = useState<DeviceOrientation>('portrait');
  const [captureOrientation, setCaptureOrientation] = useState<DeviceOrientation>('portrait');

  useEffect(() => {
    Accelerometer.setUpdateInterval(500);
    const subscription = Accelerometer.addListener(({ x, y }) => {
      // Tentukan orientasi dari vektor gravitasi
      if (Math.abs(x) > Math.abs(y)) {
        setDeviceOrientation(x > 0 ? 'landscape-right' : 'landscape-left');
      } else {
        setDeviceOrientation(y > 0 ? 'portrait' : 'upside-down');
      }
    });
    return () => subscription.remove();
  }, []);

  const isLandscape = deviceOrientation !== 'portrait';

  // ViewShot selalu menggunakan dimensi portrait (layar dikunci ke portrait)
  // Use a high-res multiplier so the captured image is much larger than screen DPs
  const VIEW_SHOT_SCALE = Math.max(PixelRatio.get(), 3); // at least 3x for high quality
  const viewShotWidth = SCREEN_WIDTH;
  const viewShotHeight = SCREEN_WIDTH * (4 / 3);
  const viewShotPixelWidth = Math.round(viewShotWidth * VIEW_SHOT_SCALE);
  const viewShotPixelHeight = Math.round(viewShotHeight * VIEW_SHOT_SCALE);

  // Logo untuk watermark
  const logoSource = require('./assets/logo_iflab.jpg');

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);
  const [lastPhotoTimestamp, setLastPhotoTimestamp] = useState<number | null>(null);
  const [lastPhotoAsset, setLastPhotoAsset] = useState<MediaLibrary.Asset | null>(null);
  const [bestPictureSize, setBestPictureSize] = useState<string | undefined>(undefined);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('24h');
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [mirrorImage, setMirrorImage] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPhotos, setGalleryPhotos] = useState<MediaLibrary.Asset[]>([]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Memuat pengaturan yang disimpan saat aplikasi dibuka
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await AsyncStorage.getItem('gps_camera_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.timeFormat) setTimeFormat(parsed.timeFormat);
          if (parsed.logoPosition) setLogoPosition(parsed.logoPosition);
          if (parsed.flash) setFlash(parsed.flash);
          if (parsed.facing) setFacing(parsed.facing);
          if (parsed.mirrorImage !== undefined) setMirrorImage(parsed.mirrorImage);
        }
      } catch (e) {
        console.warn('Failed to load settings:', e);
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Menyimpan pengaturan setiap kali ada perubahan
  useEffect(() => {
    if (!settingsLoaded) return;
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('gps_camera_settings', JSON.stringify({
          timeFormat,
          logoPosition,
          flash,
          facing,
          mirrorImage,
        }));
      } catch (e) {
        console.warn('Failed to save settings:', e);
      }
    };
    saveSettings();
  }, [timeFormat, logoPosition, flash, facing, mirrorImage, settingsLoaded]);

  // Untuk komposit watermark ViewShot offscreen
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [captureTimestamp, setCaptureTimestamp] = useState<number | null>(null);

  const cameraRef = useRef<any>(null);
  const isSavingRef = useRef(false);
  const viewShotRef = useRef<ViewShot>(null);
  const flashAnim = useRef(new Animated.Value(0)).current;

  // Data tile peta berdasarkan lokasi saat ini (URL + posisi fraksional untuk penanda)
  const mapTile = location ? getMapTile(location.latitude, location.longitude) : null;

  // Menyembunyikan navigation bar Android (mode imersif)
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBehaviorAsync('overlay-swipe');
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, []);

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
    return <View style={styles.centered}><Text>Loading Camera...</Text></View>;
  }

  if (!permission.granted) {
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
    setBestPictureSize(undefined);
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    setFlash(current => (current === 'off' ? 'on' : 'off'));
  };

  const capturePhoto = async () => {
    if (isCapturing || !cameraRef.current) return;

    setIsCapturing(true);
    setCaptureOrientation(deviceOrientation);

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 150, useNativeDriver: true })
    ]).start();

    try {
      // Ambil foto menggunakan kamera (suara rana dinonaktifkan)
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        shutterSound: false,
        exif: true,
      });
      if (!photo?.uri) throw new Error("Camera returned no photo");

      // Simpan timestamp saat pengambilan foto untuk watermark
      const now = Date.now();
      setCaptureTimestamp(now);
      setLastPhotoTimestamp(now);
      setLastPhotoAsset(null);

      // Normalisasi orientasi foto agar selalu tampil portrait
      const normalizedUri = await normalizePhotoOrientation(
        photo.uri,
        deviceOrientation,
        photo.exif,
        photo.width,
        photo.height
      );

      // Set foto yang tertunda — onLoad dari Gambar ViewShot offscreen akan memicu proses komposit
      setPendingPhoto(normalizedUri);
    } catch (error) {
      console.error('Capture failed', error);
      setIsCapturing(false);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const getCustomFilename = (timestamp: number) => {
    const date = new Date(timestamp);
    const hour = String(date.getHours()).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${hour}_${dd}_${mm}_${yyyy}`;
  };

  // Menyimpan foto ke album khusus aplikasi
  const saveToAppAlbum = async (uri: string, timestamp: number): Promise<MediaLibrary.Asset | null> => {
    try {
      const customName = getCustomFilename(timestamp);
      const fileExtension = uri.split('.').pop() || 'jpg';
      const newLocalUri = `${FileSystem.cacheDirectory}${customName}.${fileExtension}`;

      // Hapus file tujuan jika sudah ada untuk menghindari masalah cache/copy
      const fileInfo = await FileSystem.getInfoAsync(newLocalUri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(newLocalUri, { idempotent: true });
      }

      // Salin file ke URI kustom dengan nama yang diinginkan
      await FileSystem.copyAsync({
        from: uri,
        to: newLocalUri,
      });

      const album = await MediaLibrary.getAlbumAsync(APP_ALBUM_NAME);
      let createdAsset: MediaLibrary.Asset | null = null;
      if (album) {
        // Simpan langsung ke album yang sudah ada tanpa duplikasi dan tanpa prompt move/delete
        createdAsset = await MediaLibrary.createAssetAsync(newLocalUri, album);
      } else {
        // Buat asset terlebih dahulu
        const asset = await MediaLibrary.createAssetAsync(newLocalUri);
        // Buat album dan salin asset (menggunakan true agar aman dari crash/prompt di semua versi Android)
        await MediaLibrary.createAlbumAsync(APP_ALBUM_NAME, asset, true);
        createdAsset = asset;
      }

      // Hapus file kustom sementara dari cache
      try {
        await FileSystem.deleteAsync(newLocalUri, { idempotent: true });
      } catch (err) {
        console.warn('Failed to delete temp file:', err);
      }
      return createdAsset;
    } catch (e) {
      console.warn('Failed to save to app album:', e);
      return null;
    }
  };

  // Dipanggil saat Gambar offscreen di dalam ViewShot selesai dimuat
  const handlePendingImageLoad = async () => {
    if (isSavingRef.current) return;
    isSavingRef.current = true;

    // Tunggu frame berikutnya dan delay lebih panjang untuk memastikan gambar sepenuhnya di-render
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 300);
      });
    });

    const timestamp = captureTimestamp || Date.now();

    try {
      const watermarkedUri = await viewShotRef.current?.capture?.();
      if (!watermarkedUri) throw new Error("ViewShot capture returned no URI");

      setLastPhoto(watermarkedUri);

      if (mediaPermission?.granted) {
        const asset = await saveToAppAlbum(watermarkedUri, timestamp);
        if (asset) setLastPhotoAsset(asset);
      }
    } catch (err) {
      console.error('ViewShot capture failed, saving raw photo', err);
      // Cadangan: simpan foto mentah tanpa watermark
      if (pendingPhoto) {
        setLastPhoto(pendingPhoto);
        if (mediaPermission?.granted) {
          const asset = await saveToAppAlbum(pendingPhoto, timestamp);
          if (asset) setLastPhotoAsset(asset);
        }
      }
    } finally {
      setPendingPhoto(null);
      setCaptureTimestamp(null);
      setIsCapturing(false);
      isSavingRef.current = false;
    }
  };

  const sharePhoto = async () => {
    if (lastPhoto) {
      await Sharing.shareAsync(lastPhoto);
    }
  };

  const openPreview = () => {
    if (lastPhoto) {
      setShowPreview(true);
    } else {
      loadGallery();
    }
  };

  const closePreview = () => {
    setShowPreview(false);
  };

  const openGalleryFromPreview = () => {
    setShowPreview(false);
    loadGallery();
  };

  const deletePhoto = async () => {
    try {
      let assetToDelete: MediaLibrary.Asset | null = lastPhotoAsset;

      if (!assetToDelete && lastPhoto) {
        const album = await MediaLibrary.getAlbumAsync(APP_ALBUM_NAME);
        if (album) {
          const { assets } = await MediaLibrary.getAssetsAsync({
            album,
            mediaType: 'photo',
            first: 100,
            sortBy: [[MediaLibrary.SortBy.creationTime, false]],
          });
          assetToDelete =
            assets.find(
              (a) => a.uri === lastPhoto || a.filename === lastPhoto.split('/').pop()
            ) || null;
        }
      }

      if (assetToDelete) {
        const success = await MediaLibrary.deleteAssetsAsync([assetToDelete]);
        if (!success) {
          return;
        }
        setGalleryPhotos((prev) => prev.filter((p) => p.id !== assetToDelete?.id));
      }
    } catch (error) {
      console.warn('Failed to delete asset from MediaLibrary:', error);
    }

    if (lastPhoto && lastPhoto.startsWith('file://')) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(lastPhoto);
        if (fileInfo.exists) {
          await FileSystem.deleteAsync(lastPhoto, { idempotent: true });
        }
      } catch (err) {
        console.warn('Failed to delete local photo file:', err);
      }
    }

    setLastPhoto(null);
    setLastPhotoTimestamp(null);
    setLastPhotoAsset(null);
    setShowPreview(false);
  };

  const loadGallery = async () => {
    let hasPermission = mediaPermission?.granted;
    if (!hasPermission) {
      const permissionResponse = await requestMediaPermission();
      hasPermission = permissionResponse.granted;
    }
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Please grant media library permissions to access the gallery.');
      return;
    }
    try {
      const album = await MediaLibrary.getAlbumAsync(APP_ALBUM_NAME);
      if (!album) {
        setGalleryPhotos([]);
        setShowGallery(true);
        return;
      }
      const assets = await MediaLibrary.getAssetsAsync({
        album,
        mediaType: 'photo',
        sortBy: [MediaLibrary.SortBy.creationTime],
        first: 50,
      });
      setGalleryPhotos(assets.assets);
      setShowGallery(true);
    } catch (e) {
      console.warn('Failed to load gallery:', e);
    }
  };

  const openGalleryPhoto = async (asset: MediaLibrary.Asset) => {
    const info = await MediaLibrary.getAssetInfoAsync(asset);
    setLastPhoto(info.localUri || asset.uri);
    setLastPhotoTimestamp(asset.creationTime);
    setLastPhotoAsset(asset);
    setShowGallery(false);
    setShowPreview(true);
  };

  const logoPositionStyle = (pos: string) => {
    switch (pos) {
      case 'top-left': return { top: 12, left: 12 };
      case 'top-right': return { top: 12, right: 12 };
      case 'bottom-left': return { bottom: 150, left: 12 };
      case 'bottom-right': return { bottom: 150, right: 12 };
      default: return { top: 12, right: 12 };
    }
  };

  // Style komputasi untuk overlay orientasi yang membungkus watermark + logo
  const CAMERA_W = SCREEN_WIDTH;
  const CAMERA_H = SCREEN_WIDTH * (4 / 3);

  const getOrientedOverlayStyle = (orientation: DeviceOrientation) => {
    if (orientation === 'portrait') {
      return StyleSheet.absoluteFillObject;
    }
    if (orientation === 'upside-down') {
      return {
        ...StyleSheet.absoluteFillObject,
        transform: [{ rotate: '180deg' }],
      };
    }
    const rotation = orientation === 'landscape-left' ? '-90deg' : '90deg';
    return {
      position: 'absolute' as const,
      left: (CAMERA_W - CAMERA_H) / 2,
      top: (CAMERA_H - CAMERA_W) / 2,
      width: CAMERA_H,
      height: CAMERA_W,
      transform: [{ rotate: rotation }],
    };
  };

  // Foto hasil tangkapan sudah dinormalisasi ke portrait, sehingga selalu menggunakan absoluteFill
  const getCapturedBackgroundImageStyle = () => {
    return StyleSheet.absoluteFillObject;
  };

  const orientedOverlayStyle = getOrientedOverlayStyle(deviceOrientation);
  // Watermark pada hasil tangkapan selalu tampil dalam orientasi portrait yang benar
  const capturedOverlayStyle = StyleSheet.absoluteFillObject;

  const cycleLogoPosition = () => {
    const positions: Array<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'> = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    const idx = positions.indexOf(logoPosition);
    setLogoPosition(positions[(idx + 1) % positions.length]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <RNStatusBar barStyle="light-content" />

      {/* ViewShot offscreen untuk komposit watermark */}
      <View style={[styles.offscreen, { width: viewShotWidth, height: viewShotHeight }]} collapsable={false}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: "jpg", quality: 1.0, width: viewShotPixelWidth, height: viewShotPixelHeight }}
          style={[styles.offscreenViewShot, { backgroundColor: '#000' }]}
        >
          {pendingPhoto && (
            <View style={styles.offscreenViewShot} collapsable={false}>
              <View style={[StyleSheet.absoluteFill, mirrorImage && { transform: [{ scaleX: -1 }] }]} collapsable={false}>
                <Image
                  source={{ uri: pendingPhoto }}
                  style={getCapturedBackgroundImageStyle()}
                  resizeMode="cover"
                  onLoad={handlePendingImageLoad}
                />
              </View>

              {/* Overlay orientasi — mencocokkan preview langsung */}
              <View style={capturedOverlayStyle}>
                <View style={[styles.logoContainer, logoPositionStyle(logoPosition)]}>
                  <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
                </View>

                {/* Overlay Watermark GPS yang disematkan ke hasil tangkapan */}
                <View style={styles.watermarkContainer}>
                  <View style={styles.watermarkInnerBg}>
                    <View style={styles.watermarkContent}>
                      <View style={styles.watermarkLeft}>
                        {mapTile && (
                          <View style={styles.mapThumbnailContainer}>
                            <Image source={{ uri: mapTile.url }} style={styles.mapThumbnail} resizeMode="cover" />
                            <View style={[styles.mapMarker, { left: `${mapTile.xFraction * 100}%`, top: `${mapTile.yFraction * 100}%` }]}>
                              <View style={styles.mapMarkerShadow} />
                              <MapPin size={18} color="#ef4444" fill="#ef4444" strokeWidth={2} />
                            </View>
                          </View>
                        )}
                      </View>
                      <View style={styles.watermarkRight}>
                        <Text style={styles.addressTitle}>
                          {address ? [address.district, address.region, address.country].filter(Boolean).join(', ') : '---'}
                        </Text>
                        {address?.street && (
                          <Text style={styles.addressDetail}>
                            {[address.name, address.street, address.district, address.region, address.postalCode, address.country].filter(Boolean).join(', ')}
                          </Text>
                        )}
                        <Text style={styles.coordTextSmall}>
                          Lat {location ? location.latitude.toFixed(6) : '---'}° Long {location ? location.longitude.toFixed(6) : '---'}°
                        </Text>
                        <Text style={styles.dateText}>
                          {formatDateTime(captureTimestamp || location?.timestamp || Date.now(), timeFormat)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ViewShot>
      </View>

      {/* Tampilan Kamera Langsung */}
      <View style={styles.fullCameraWrapper}>
        <CameraView
          ref={cameraRef}
          style={[styles.camera, mirrorImage && { transform: [{ scaleX: -1 }] }]}
          facing={facing}
          flash={flash}
          pictureSize={bestPictureSize}
          onCameraReady={async () => {
            try {
              const sizes = await cameraRef.current?.getAvailablePictureSizesAsync?.();
              if (sizes && sizes.length > 0) {
                // Pick the largest 4:3 size, or fallback to the largest overall
                let best = sizes[0];
                let bestPixels = 0;
                for (const s of sizes) {
                  const parts = s.split('x');
                  if (parts.length === 2) {
                    const w = parseInt(parts[0], 10);
                    const h = parseInt(parts[1], 10);
                    const pixels = w * h;
                    const ratio = Math.max(w, h) / Math.min(w, h);
                    // Prefer 4:3 ratio (1.333) with some tolerance
                    if (Math.abs(ratio - 4 / 3) < 0.05 && pixels > bestPixels) {
                      best = s;
                      bestPixels = pixels;
                    }
                  }
                }
                // If no 4:3 found, pick the largest overall
                if (bestPixels === 0) {
                  for (const s of sizes) {
                    const parts = s.split('x');
                    if (parts.length === 2) {
                      const pixels = parseInt(parts[0], 10) * parseInt(parts[1], 10);
                      if (pixels > bestPixels) {
                        best = s;
                        bestPixels = pixels;
                      }
                    }
                  }
                }
                setBestPictureSize(best);
              }
            } catch (e) {
              console.warn('Could not get available picture sizes:', e);
            }
          }}
        >
          <View style={[StyleSheet.absoluteFill, mirrorImage && { transform: [{ scaleX: -1 }] }]} pointerEvents="none">
            {/* Overlay orientasi: memutar watermark + logo agar sesuai kemiringan perangkat */}
            <View style={orientedOverlayStyle}>
              {/* Logo (preview langsung) */}
              <View style={[styles.logoContainer, logoPositionStyle(logoPosition)]}>
                <Image source={logoSource} style={styles.logoImage} resizeMode="contain" />
              </View>

              {/* Overlay Watermark GPS Bawah (preview langsung) */}
              <View style={styles.watermarkContainer}>
                <View style={styles.watermarkInnerBg}>
                  <View style={styles.watermarkContent}>
                    <View style={styles.watermarkLeft}>
                      {mapTile && (
                        <View style={styles.mapThumbnailContainer}>
                          <Image source={{ uri: mapTile.url }} style={styles.mapThumbnail} resizeMode="cover" />
                          <View style={[styles.mapMarker, { left: `${mapTile.xFraction * 100}%`, top: `${mapTile.yFraction * 100}%` }]}>
                            <View style={styles.mapMarkerShadow} />
                            <MapPin size={18} color="#ef4444" fill="#ef4444" strokeWidth={2} />
                          </View>
                        </View>
                      )}
                    </View>
                    <View style={styles.watermarkRight}>
                      <Text style={styles.addressTitle}>
                        {address ? [address.district, address.region, address.country].filter(Boolean).join(', ') : '---'}
                      </Text>
                      {address?.street && (
                        <Text style={styles.addressDetail}>
                          {[address.name, address.street, address.district, address.region, address.postalCode, address.country].filter(Boolean).join(', ')}
                        </Text>
                      )}
                      <Text style={styles.coordTextSmall}>
                        Lat {location ? location.latitude.toFixed(6) : '---'}° Long {location ? location.longitude.toFixed(6) : '---'}°
                      </Text>
                      <Text style={styles.dateText}>
                        {formatDateTime(location?.timestamp || Date.now(), timeFormat)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </CameraView>
      </View>

      {/* Bar Navigasi Atas */}
      <SafeAreaView style={styles.topBar}>
        <View style={styles.topBarRow}>
          {/* Tombol Flash */}
          <TouchableOpacity style={styles.topBarButton} onPress={toggleFlash}>
            {flash === 'on' ? (
              <Zap size={20} color="#fbbf24" fill="#fbbf24" />
            ) : (
              <ZapOff size={20} color="#fff" opacity={0.6} />
            )}
          </TouchableOpacity>

          {/* Badge Status GPS */}
          <BlurView intensity={30} tint="dark" style={styles.statusBadge}>
            <MapPin size={14} color={location ? "#4ade80" : "#f87171"} strokeWidth={3} />
            <Text style={styles.statusText}>
              {locationLoading ? "Searching GPS..." : (location ? "GPS LOCKED" : "GPS ERROR")}
            </Text>
          </BlurView>

          {/* Pengaturan */}
          <TouchableOpacity
            style={styles.topBarButton}
            onPress={() => setShowSettings(true)}
          >
            <Settings size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Overlay Animasi Pengambilan Foto */}
      <Animated.View
        style={[
          styles.flashOverlay,
          { opacity: flashAnim }
        ]}
        pointerEvents="none"
      />

      {/* Overlay Kontrol UI (Tidak ditangkap oleh ViewShot) */}
      <SafeAreaView style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          {/* Galeri / Foto Terakhir — membuka preview jika ada foto, atau membuka galeri jika belum ada */}
          <TouchableOpacity
            style={styles.sideButton}
            onPress={openPreview}
          >
            {lastPhoto ? (
              <Image source={{ uri: lastPhoto }} style={styles.thumbnailImage} />
            ) : (
              <ImageIcon size={24} color="#fff" />
            )}
          </TouchableOpacity>

          {/* Tombol Tangkap Utama */}
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

          {/* Putar Kamera */}
          <TouchableOpacity style={styles.sideButton} onPress={toggleFacing}>
            <RefreshCw size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Toast Error */}
      {errorMsg && (
        <View style={styles.errorToast}>
          <XCircle size={16} color="#f87171" />
          <Text style={styles.errorToastText}>{errorMsg}</Text>
        </View>
      )}

      {/* Modal Preview Foto */}
      <PhotoPreviewModal
        visible={showPreview}
        onClose={closePreview}
        photoUri={lastPhoto}
        photoTimestamp={lastPhotoTimestamp}
        timeFormat={timeFormat}
        onDelete={deletePhoto}
        onShare={sharePhoto}
        onOpenGallery={openGalleryFromPreview}
      />

      {/* Tampilan Galeri */}
      <GalleryView
        visible={showGallery}
        onClose={() => setShowGallery(false)}
        photos={galleryPhotos}
        onOpenPhoto={openGalleryPhoto}
      />

      {/* Modal Pengaturan */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        flash={flash}
        onToggleFlash={toggleFlash}
        facing={facing}
        onToggleFacing={toggleFacing}
        locationLocked={!!location}
        timeFormat={timeFormat}
        onToggleTimeFormat={() => setTimeFormat(f => f === '24h' ? '12h' : '24h')}
        logoPosition={logoPosition}
        onCycleLogoPosition={cycleLogoPosition}
        mirrorImage={mirrorImage}
        onToggleMirrorImage={() => setMirrorImage(m => !m)}
      />
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
  // Kontainer offscreen untuk komposit ViewShot (dimensi diatur inline)
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
    overflow: 'hidden',
  },
  offscreenViewShot: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (4 / 3),
  },
  camera: {
    width: '100%',
    aspectRatio: 3 / 4,
  },
  galleryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 200,
  },
  fullCameraWrapper: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingTop: 36,
    paddingHorizontal: 16,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  topBarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
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
  },
  watermarkInnerBg: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 12,
    margin: 10,
    padding: 12,
  },
  watermarkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  watermarkLeft: {
    flexShrink: 0,
  },
  watermarkRight: {
    flex: 1,
    gap: 2,
  },
  addressTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  addressDetail: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '400',
    opacity: 0.85,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  coordTextSmall: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  dateText: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.7,
  },
  logoContainer: {
    position: 'absolute',
    zIndex: 5,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 8,
    padding: 4,
  },
  logoImage: {
    width: 45,
    height: 45,
    borderRadius: 4,
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
    overflow: 'hidden',
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
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
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
  },
  // Style thumbnail peta
  mapThumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
    position: 'relative',
  },
  mapThumbnail: {
    width: '100%',
    height: '100%',
  },
  mapMarker: {
    position: 'absolute',
    marginTop: -18,
    marginLeft: -9,
    alignItems: 'center',
  },
  mapMarkerShadow: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.7)',
    bottom: 0,
    alignSelf: 'center',
  },
});
