import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/IconButton';
import { ListPanel } from '@/components/ListPanel';
import { SaveRow } from '@/components/SaveRow';
import { Text } from '@/components/Text';
import { WeekAskRow } from '@/components/WeekAskRow';
import { ChevronLeftIcon } from '@/icons/ChevronLeftIcon';
import { MONTHS } from '@/lib/format';
import { useThumbnailUrls } from '@/lib/saves';
import { track } from '@/lib/track';
import { rangeLabel } from '@/lib/week';
import { markWeekOpened, useWeek } from '@/lib/weekData';
import { collectionScreen, colors, detail, size, spacing, tabularNums } from '@/theme';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

// Your week in Parso (owner request, step 11): the week in numbers, recent saves with the AI's question about each
// (Done, Remind me, Open), and one older save brought back.
export default function WeekScreen() {
  const insets = useSafeAreaInsets();
  const { range, data, isPending, isError, refetch } = useWeek();
  const [doneAt, setDoneAt] = useState<Record<string, string | null>>({});
  const [refreshing, setRefreshing] = useState(false);
  const { data: thumbnails } = useThumbnailUrls([
    ...(data?.asks ?? []).flatMap((s) => (s.thumbnail_path ? [s.thumbnail_path] : [])),
    ...(data?.past?.thumbnail_path ? [data.past.thumbnail_path] : []),
  ]);

  useEffect(() => {
    void markWeekOpened();
    track('week_opened');
  }, []);

  const refresh = () => {
    setRefreshing(true);
    setDoneAt({});
    refetch().finally(() => setRefreshing(false));
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.titleTop }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <IconButton label="Back" onPress={goBack}>
          <ChevronLeftIcon color={colors.ink} size={size.iconButtonIcon} strokeWidth={size.iconStroke} />
        </IconButton>
      </View>
      <Text variant="screenTitle" accessibilityRole="header" style={styles.title}>
        Your week in Parso
      </Text>
      <Text variant="secondary" color={colors.secondary} style={[styles.inset, tabularNums]}>
        {rangeLabel(range, MONTHS)}
      </Text>

      {isPending ? (
        <ActivityIndicator style={styles.section} color={colors.secondary} />
      ) : isError || !data ? (
        <Text variant="secondary" color={colors.secondary} style={[styles.section, styles.inset]}>
          Couldn't load your week. Check your connection and pull down to try again.
        </Text>
      ) : (
        <>
          <View style={styles.section}>
            {data.saved === 0 ? (
              <Text color={colors.secondary} style={styles.inset}>
                Nothing new this week. Share a post, a link or a screenshot to Parso and it'll be here next Sunday.
              </Text>
            ) : (
              <ListPanel>
                <Stat label="Saved" value={String(data.saved)} />
                <Stat label="Done" value={String(data.done)} />
                {data.mostSaved ? <Stat label="Most saved" value={data.mostSaved} /> : null}
              </ListPanel>
            )}
          </View>

          {data.asks.length ? (
            <View style={styles.section}>
              <Text variant="sectionHeading" accessibilityRole="header" style={styles.heading}>
                What were you going to do with these?
              </Text>
              <ListPanel>
                {data.asks.map((save) => (
                  <WeekAskRow
                    key={save.id}
                    save={save}
                    thumbnailUrl={save.thumbnail_path ? thumbnails?.[save.thumbnail_path] : undefined}
                    doneAt={save.id in doneAt ? doneAt[save.id] : save.done_at}
                    onDoneChange={(at) => setDoneAt((current) => ({ ...current, [save.id]: at }))}
                  />
                ))}
              </ListPanel>
            </View>
          ) : null}

          {data.past ? (
            <View style={styles.section}>
              <Text variant="sectionHeading" accessibilityRole="header" style={styles.heading}>
                From your past
              </Text>
              <ListPanel>
                <SaveRow
                  save={data.past}
                  thumbnailUrl={data.past.thumbnail_path ? thumbnails?.[data.past.thumbnail_path] : undefined}
                />
              </ListPanel>
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}`}>
      <Text variant="detailLabel" color={colors.secondary}>
        {label}
      </Text>
      <Text variant="detailValue" numberOfLines={1} style={[styles.statValue, tabularNums]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.screen, paddingBottom: spacing.sectionGapLarge },
  header: { flexDirection: 'row' },
  title: { marginTop: collectionScreen.headerToTitle, paddingHorizontal: spacing.titleInset },
  inset: { paddingHorizontal: spacing.titleInset },
  section: { marginTop: spacing.sectionGapLarge },
  heading: { paddingHorizontal: spacing.titleInset, marginBottom: spacing.headingToPanel },
  stat: {
    minHeight: detail.rowHeight,
    paddingHorizontal: spacing.rowPaddingX,
    flexDirection: 'row',
    alignItems: 'center',
    gap: detail.rowGap,
  },
  statValue: { flex: 1, textAlign: 'right' },
});
