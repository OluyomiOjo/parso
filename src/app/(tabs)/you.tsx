import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Text } from '@/components/Text';
import { deleteAccount, signOut, useSession } from '@/lib/auth';
import { colors, spacing } from '@/theme';

export default function YouScreen() {
  const { session } = useSession();
  const email = session?.user.email;
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () =>
    Alert.alert('Delete your account?', "This removes all your saves, collections and pictures and can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete account',
        style: 'destructive',
        onPress: () => {
          setDeleting(true);
          deleteAccount().catch((e: Error) => {
            setDeleting(false);
            Alert.alert(e.message);
          });
        },
      },
    ]);

  return (
    <Screen>
      <ScreenTitle>You</ScreenTitle>
      <View style={styles.content}>
        {email ? (
          <Text variant="secondary" color={colors.secondary} style={styles.email}>
            Signed in as {email}
          </Text>
        ) : null}
        <Button label="Sign out" variant="secondary" onPress={signOut} />
        <Pressable
          onPress={confirmDelete}
          disabled={deleting}
          accessibilityRole="button"
          hitSlop={spacing.sm}
          style={styles.delete}
        >
          <Text variant="secondary" color={colors.secondary}>
            {deleting ? 'Deleting your account…' : 'Delete account'}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { marginTop: spacing.sectionGapLarge, gap: spacing.sectionGap },
  email: { paddingHorizontal: spacing.titleInset },
  delete: { alignSelf: 'flex-start', paddingVertical: spacing.md, paddingHorizontal: spacing.titleInset },
});
