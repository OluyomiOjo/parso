import { router } from 'expo-router';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';

import { LinkIcon } from '@/icons/LinkIcon';
import { metaLabel, MONTHS, relativeTime } from '@/lib/format';
import { displayUrl } from '@/lib/links';
import { openSave } from '@/lib/notes';
import { useMarkDone } from '@/lib/saves';
import { doneLabel } from '@/lib/week';
import type { AskSave } from '@/lib/weekData';
import { colors, radius, size, spacing, week } from '@/theme';

import { Pill } from './Pill';
import { SourceLine } from './SourceLine';
import { Text } from './Text';

type Props = {
  save: AskSave;
  thumbnailUrl?: string;
  doneAt: string | null; // kept on the screen, so a save marked done stays in place with Undo
  onDoneChange: (doneAt: string | null) => void;
};

// One save on the weekly screen: picture, title, where it's from, then Done, Remind me and Open.
export function WeekAskRow({ save, thumbnailUrl, doneAt, onDoneChange }: Props) {
  const markDone = useMarkDone(save.id);
  const title = save.title ?? (save.url ? displayUrl(save.url) : 'Your save');
  const meta = `${metaLabel(save)}, ${relativeTime(save.created_at)}`;
  const setDone = (done: boolean) =>
    markDone.mutate(done, { onSuccess: onDoneChange, onError: (error) => Alert.alert(error.message) });
  const remind = () => router.push({ pathname: '/item-edit/[id]', params: { id: save.id, field: 'reminder' } });

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => openSave(save)}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${meta}`}
        style={styles.top}
      >
        {thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={styles.thumb} accessibilityIgnoresInvertColors />
        ) : (
          <View style={styles.thumb}>
            <LinkIcon color={colors.secondary} size={size.thumbIcon} strokeWidth={size.iconStroke} />
          </View>
        )}
        <View style={styles.text}>
          <Text variant="rowTitle" numberOfLines={2}>
            {title}
          </Text>
          <SourceLine kind={save.kind} source={save.source} text={meta} />
        </View>
      </Pressable>
      {doneAt ? (
        <View style={styles.doneRow}>
          <Text variant="secondary" color={colors.secondary}>
            {doneLabel(doneAt, MONTHS)}
          </Text>
          <Pressable onPress={() => setDone(false)} accessibilityRole="button" hitSlop={spacing.sm}>
            <Text variant="secondary" style={styles.link}>
              Undo
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actions}>
          <Pill label="Done" selected onPress={() => setDone(true)} accessibilityLabel={`Mark ${title} as done`} />
          <Pill label="Remind me" onPress={remind} />
          <Pill label="Open" onPress={() => openSave(save)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.rowPaddingX, paddingVertical: spacing.rowPaddingY },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.rowGap },
  thumb: {
    width: size.thumb,
    height: size.thumb,
    borderRadius: radius.thumb,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  actions: { flexDirection: 'row', gap: week.actionGap, marginTop: week.actionsTop },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: week.doneGap, marginTop: week.actionsTop },
  link: { textDecorationLine: 'underline' },
});
