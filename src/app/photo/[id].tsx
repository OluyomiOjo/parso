import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/IconButton";
import { CloseIcon } from "@/icons/CloseIcon";
import { useSession } from "@/lib/auth";
import { useSave } from "@/lib/saves";
import { supabase } from "@/lib/supabase";
import { colors, photoViewer, size, spacing } from "@/theme";

const SIGNED_SECONDS = 60 * 60;

// A photo or screenshot at full size. Pinch to zoom.
export default function PhotoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { session } = useSession();
  const { data: save } = useSave(id);
  const userId = session?.user.id;

  const { data: uri } = useQuery({
    queryKey: ["photo", id],
    enabled: Boolean(save && userId),
    staleTime: (SIGNED_SECONDS - 5 * 60) * 1000,
    queryFn: async (): Promise<string | null> => {
      const original = await supabase.storage
        .from("uploads")
        .createSignedUrl(`${userId}/${id}.jpg`, SIGNED_SECONDS);
      if (original.data?.signedUrl) return original.data.signedUrl;
      if (!save?.thumbnail_path) return null;
      const thumb = await supabase.storage
        .from("thumbnails")
        .createSignedUrl(save.thumbnail_path, SIGNED_SECONDS);
      return thumb.data?.signedUrl ?? null;
    },
  });

  return (
    <View style={styles.screen}>
      <ScrollView
        maximumZoomScale={photoViewer.maxZoom}
        minimumZoomScale={1}
        centerContent
        bouncesZoom
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: window.width, height: window.height }}
            resizeMode="contain"
            accessibilityLabel={save?.title ?? "Photo"}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <ActivityIndicator color={colors.onInk} />
        )}
      </ScrollView>
      <View style={[styles.close, { top: insets.top + spacing.sm }]}>
        <IconButton label="Close" onPress={() => router.back()}>
          <CloseIcon
            color={colors.ink}
            size={size.iconButtonIcon}
            strokeWidth={size.iconStroke}
          />
        </IconButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  close: { position: "absolute", right: spacing.screen },
});
