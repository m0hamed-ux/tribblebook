import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  LayoutChangeEvent,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface CarouselProps {
  images: string[];
}

const Carousel: React.FC<CarouselProps> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const layoutWidth = event.nativeEvent.layoutMeasurement?.width || 1;
    const slide = Math.round(event.nativeEvent.contentOffset.x / layoutWidth);
    if (slide !== activeIndex) {
      setActiveIndex(slide);
    }
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== containerWidth) setContainerWidth(w);
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {containerWidth > 0 && (
        <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ height: containerWidth, width: "100%" }}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item, index }) => (
          <Pressable onPress={() => { setViewerIndex(index); setViewerVisible(true); }}>
            <View style={[styles.imageContainer, { width: containerWidth, height: containerWidth }]}>
              {/* Blurred background */}
              <Image
                source={{ uri: item }}
                style={styles.backgroundImage}
                blurRadius={20}
              />

              {/* Foreground main image */}
              <Image
                source={{ uri: item }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>
          </Pressable>
        )}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      />
      )}

      {/* Pagination dots */}
      {images.length > 1 && (
        <View style={styles.pagination}>
          {images.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: index === activeIndex ? "#1D9BF0" : "#5656564e" },
          ]}
        />
          ))}
        </View>
      )}
      {/* Fullscreen viewer modal */}
      {images[viewerIndex] && (
        <ViewerModal
          visible={viewerVisible}
          uri={images[viewerIndex]}
          onClose={() => setViewerVisible(false)}
        />
      )}
    </View>
  );
};

// --- Fullscreen viewer modal component could be inline for simplicity ---
const ViewerModal: React.FC<{
  visible: boolean;
  uri: string;
  onClose: () => void;
}> = ({ visible, uri, onClose }) => {
  const [saving, setSaving] = useState(false);

  const saveToGallery = async () => {
    try {
      setSaving(true);
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Permission to access media library denied");
      }

      const fileName = uri.split("/").pop() || `image_${Date.now()}`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const downloadRes = await FileSystem.downloadAsync(uri, fileUri);
      const asset = await MediaLibrary.createAssetAsync(downloadRes.uri);
      await MediaLibrary.createAlbumAsync("Tribble", asset, false).catch(() => null);
      setSaving(false);
      return true;
    } catch (err) {
      console.warn("Save failed", err);
      setSaving(false);
      return false;
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={viewerStyles.container}>
        <Image source={{ uri }} style={viewerStyles.image} resizeMode="contain" />

        <View style={viewerStyles.topRow}>
          <Pressable onPress={onClose} style={viewerStyles.iconButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
        </View>

        <View style={viewerStyles.bottomRow}>
          <Pressable
            onPress={saveToGallery}
            style={[viewerStyles.actionButton, saving ? { opacity: 0.6 } : null]}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={viewerStyles.actionText}>تحميل</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  imageContainer: {
    // width and height are set dynamically from measured containerWidth
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#000",
  },
  backgroundImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  pagination: {
    position: "absolute",
    bottom: 10,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 0,
  },
  dot: {
    height: 6,
    width: 6,
    borderRadius: 4,
    marginHorizontal: 2,
  },
});

export default Carousel;

const viewerStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  topRow: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 12,
  },
  bottomRow: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  iconButton: {
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 8,
  },
  actionText: {
    color: "#fff",
    marginLeft: 6,
  },
});
