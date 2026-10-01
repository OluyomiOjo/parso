import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Screen } from '@/components/Screen';
import { ScreenTitle } from '@/components/ScreenTitle';
import { Text } from '@/components/Text';
import { signOut, useSession } from '@/lib/auth';
import { colors, spacing } from '@/theme';

export default function YouScreen() {
  const { session } = useSession();
  const email = session?.user.email;

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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { marginTop: spacing.sectionGapLarge, gap: spacing.sectionGap },
  email: { paddingHorizontal: spacing.titleInset },
});
