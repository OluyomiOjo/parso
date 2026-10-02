import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";

import { DownloadIcon } from "@/icons/DownloadIcon";
import { ExternalLinkIcon } from "@/icons/ExternalLinkIcon";
import { ShareIcon } from "@/icons/ShareIcon";
import { useSession } from "@/lib/auth";
import type { SaveDetail } from "@/lib/saves";
import { SHARE_FAILED, downloadPhoto, shareSave } from "@/lib/shareOut";
import { detail, size } from "@/theme";

import { Button } from "./Button";

type Props = {
  save: SaveDetail;
  openLabel: string | null; // "Open in Instagram" for links, null otherwise
  onOpenSource: () => void;
};

const SAVED_FOR_MS = 2000;
const errorText = (error: unknown) =>
  error instanceof Error && error.message ? error.message : SHARE_FAILED;

// The detail page's fixed buttons. Links: Open in [source] and Share. Photos and screenshots: Open (full
// screen), Share (the picture itself) and Download (to Photos). Notes: Share. Everything shared ends with
// "Saved with Parso.ai".
export function DetailActions({ save, openLabel, onOpenSource }: Props) {
  const { session } = useSession();
  const userId = session?.user.id ?? "";
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), SAVED_FOR_MS);
    return () => clearTimeout(timer);
  }, [saved]);

  const share = async () => {
    setSharing(true);
    try {
      await shareSave(save, userId);
    } catch (error) {
      Alert.alert(errorText(error));
    } finally {
      setSharing(false);
    }
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadPhoto(save, userId);
      setSaved(true);
    } catch (error) {
      Alert.alert(errorText(error));
    } finally {
      setDownloading(false);
    }
  };

  const icon = (Icon: typeof ShareIcon) => (color: string) => (
    <Icon color={color} size={size.buttonIcon} strokeWidth={size.iconStroke} />
  );
  const shareButton = (variant: "primary" | "secondary", withIcon: boolean) => (
    <Button
      label="Share"
      variant={variant}
      onPress={share}
      busy={sharing}
      icon={withIcon ? icon(ShareIcon) : undefined}
    />
  );

  if (save.kind === "image" || save.kind === "screenshot") {
    return (
      <View style={styles.row}>
        <View style={styles.equal}>
          <Button
            label="Open"
            onPress={() =>
              router.push({ pathname: "/photo/[id]", params: { id: save.id } })
            }
          />
        </View>
        <View style={styles.equal}>{shareButton("secondary", false)}</View>
        <View style={styles.equal}>
          <Button
            label={saved ? "Saved" : "Download"}
            variant="secondary"
            onPress={download}
            busy={downloading}
            disabled={saved}
          />
        </View>
      </View>
    );
  }

  if (save.kind === "link" && openLabel) {
    return (
      <View style={styles.row}>
        <View style={styles.grow}>
          <Button
            label={openLabel}
            onPress={onOpenSource}
            icon={icon(ExternalLinkIcon)}
          />
        </View>
        <View style={styles.share}>{shareButton("secondary", true)}</View>
      </View>
    );
  }

  return shareButton("primary", true);
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: detail.actionGap },
  equal: { flex: 1 },
  grow: { flex: 1 },
  share: { width: detail.shareWidth },
});
