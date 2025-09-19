import React, { useRef, useState } from "react";
import {
  FlatList,
  Image,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  View,
} from "react-native";

interface CarouselProps {
  images: string[];
}

const Carousel: React.FC<CarouselProps> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const flatListRef = useRef<FlatList<string>>(null);

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
        renderItem={({ item }) => (
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
    </View>
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
