import { t } from "@/i18n";
import React from "react";
import {
  ImageSourcePropType,
  ImageURISource,
  StyleSheet,
  Text,
  View
} from "react-native";
import ImageZoomViewer from "react-native-image-zoom-viewer";

type Props = {
  imgSource: ImageSourcePropType;
};

const ZoomViewer = ImageZoomViewer as unknown as React.ComponentType<
  Record<string, unknown>
>;

export default function ImageViewer({ imgSource }: Props) {
  const imageItem = (() => {
/*     const resolved = Image.resolveAssetSource(imgSource);
    if (resolved?.uri) return { url: resolved.uri }; */

    if (typeof imgSource === "number") {
      return { url: "", props: { source: imgSource } };
    }
    const src = imgSource as ImageURISource;
    if (src?.uri) return { url: src.uri };
    return { url: "", props: { source: imgSource } };
  })();

  if (!imgSource) {
    return (
      <View style={styles.container}>
        <Text>{t("sound.noImage")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ZoomViewer
        style={styles.zoomViewer}
        imageUrls={[imageItem]}
        enableImageZoom
        saveToLocalByLongPress={false}
        backgroundColor="transparent"
        imageStyle={{ resizeMode: "contain" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  zoomViewer: { flex: 1 },
  image: { width: "100%", height: "100%" },
});
