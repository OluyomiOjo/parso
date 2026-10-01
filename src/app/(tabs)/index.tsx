import { router } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/IconButton';
import { ListPanel } from '@/components/ListPanel';
import { PasteLinkButton } from '@/components/PasteLinkButton';
import { SaveRow } from '@/components/SaveRow';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Text } from '@/components/Text';
import { LinkIcon } from '@/icons/LinkIcon';
import { useSaves, useSavesLiveUpdates, useThumbnailUrls } from '@/lib/saves';
import { colors, size, spacing } from '@/theme';

const openPaste = () => router.push('/paste');

export default function HomeScreen() {
  const { data: saves, isPending, isError, isRefetching, refetch } = useSaves();
  useSavesLiveUpdates();
  const { data: thumbnails } = useThumbnailUrls(
    (saves ?? []).flatMap((save) => (save.thumbnail_path ? [save.thumbnail_path] : [])),
  );
  const hasSaves = (saves?.length ?? 0) > 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
      >
        <View style={styles.header}>
          <ScreenTitle>My Parsos</ScreenTitle>
          {hasSaves ? (
            <View style={styles.headerButton}>
              <IconButton label="Paste a link" onPress={openPaste}>
                <LinkIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
              </IconButton>
            </View>
          ) : null}
        </View>

        {isPending ? (
          <ActivityIndicator style={styles.section} color={colors.secondary} />
        ) : isError && !saves ? (
          <Text variant="secondary" color={colors.secondary} style={styles.section}>
            Couldn't load your saves. Pull down to try again.
          </Text>
        ) : hasSaves ? (
          <View style={styles.section}>
            <Text variant="sectionHeading" accessibilityRole="header" style={styles.heading}>
              Recent
            </Text>
            <ListPanel>
              {saves!.map((save) => (
                <SaveRow
                  key={save.id}
                  save={save}
                  thumbnailUrl={save.thumbnail_path ? thumbnails?.[save.thumbnail_path] : undefined}
                />
              ))}
            </ListPanel>
          </View>
        ) : (
          <View style={styles.section}>
            <PasteLinkButton onPress={openPaste} />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.sectionGapLarge },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerButton: {
    marginTop: spacing.titleTop,
    marginRight: spacing.titleInset,
  },
  section: { marginTop: spacing.sectionGapLarge },
  heading: {
    paddingHorizontal: spacing.titleInset,
    marginBottom: spacing.headingToPanel,
  },
});
