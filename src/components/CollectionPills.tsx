import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import type { Collection } from '@/lib/collections';
import { colors, sheet, size, type } from '@/theme';

import { Pill, pillStyles } from './Pill';

type Props = {
  collections: Collection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  edgeInset?: number; // lets the row scroll edge to edge while lining up with the content
};

// Selected collection first, in black; tap another to move the save. "New" opens a name field.
export function CollectionPills({ collections, selectedId, onSelect, onCreate, edgeInset = 0 }: Props) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  // The collection the save started in goes first. Moving it doesn't reorder the pills, so the row
  // never shifts under the finger or leaves the selected pill scrolled out of view.
  const [firstId, setFirstId] = useState(selectedId);
  if (firstId === null && selectedId !== null) setFirstId(selectedId);
  const ordered = [...collections].sort((a, b) => Number(b.id === firstId) - Number(a.id === firstId));

  const submit = () => {
    if (name.trim()) onCreate(name.trim());
    setName('');
    setAdding(false);
  };

  if (adding) {
    return (
      <View style={[styles.newRow, { paddingHorizontal: edgeInset }]}>
        <TextInput
          value={name}
          onChangeText={setName}
          onSubmitEditing={submit}
          onBlur={submit}
          placeholder="Collection name"
          placeholderTextColor={colors.secondary}
          autoFocus
          returnKeyType="done"
          maxLength={40}
          accessibilityLabel="New collection name"
          style={styles.input}
        />
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { paddingHorizontal: edgeInset }]}
    >
      {ordered.map((c) => {
        const selected = c.id === selectedId;
        return (
          <Pill
            key={c.id}
            label={c.name}
            selected={selected}
            onPress={() => onSelect(c.id)}
            accessibilityLabel={selected ? `${c.name}, current collection` : `Move to ${c.name}`}
          />
        );
      })}
      <Pill label="New" onPress={() => setAdding(true)} accessibilityLabel="New collection" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: sheet.pillGap },
  newRow: { flexDirection: 'row' },
  input: {
    ...pillStyles.shape,
    flex: 1,
    fontFamily: type.pill.fontFamily,
    fontSize: type.pill.fontSize,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderWidth: size.hairline,
    borderColor: colors.ink,
  },
});
