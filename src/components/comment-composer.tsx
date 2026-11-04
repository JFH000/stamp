import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { useAddComment } from '@/hooks/use-plan-comments';

const MAX_LENGTH = 1000;

export function CommentComposer({ planId }: { planId: string }) {
  const [draft, setDraft] = useState('');
  const addComment = useAddComment(planId);
  const body = draft.trim();

  function submit() {
    if (!body || addComment.isPending) return;
    setDraft('');
    // Si falla, el texto vuelve al campo para no perderlo.
    addComment.mutate(body, { onError: () => setDraft(body) });
  }

  return (
    <View className="gap-2">
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Cuéntales a otros cómo te fue…"
        placeholderTextColor="#a3a3a3"
        multiline
        maxLength={MAX_LENGTH}
        textAlignVertical="top"
        className="min-h-24 rounded-xl border border-neutral-300 p-3 text-base text-neutral-900 dark:border-neutral-700 dark:text-white"
      />
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-neutral-500">
          {draft.length}/{MAX_LENGTH}
        </Text>
        <Button title="Publicar" onPress={submit} disabled={!body} loading={addComment.isPending} />
      </View>
      {addComment.error ? (
        <Text className="text-sm text-red-600">
          No pudimos publicar tu comentario: {addComment.error.message}
        </Text>
      ) : null}
    </View>
  );
}
