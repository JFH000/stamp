import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { APP_NAME } from '@/constants/app';
import { isGoogleAuthEnabled, sendMagicLink, signInWithGoogle } from '@/lib/auth';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const trimmedEmail = email.trim().toLowerCase();
  const isValidEmail = EMAIL_PATTERN.test(trimmedEmail);

  const magicLink = useMutation({ mutationFn: sendMagicLink });
  const google = useMutation({ mutationFn: signInWithGoogle });

  const error = magicLink.error ?? google.error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-white px-6 dark:bg-neutral-950">
      <Text className="text-4xl font-bold text-neutral-900 dark:text-white">{APP_NAME}</Text>
      <Text className="mb-10 mt-2 text-lg text-neutral-600 dark:text-neutral-400">
        100 planes para hacer en Bogotá.
      </Text>

      {magicLink.isSuccess ? (
        <View className="gap-4">
          <Text className="text-base text-neutral-800 dark:text-neutral-200">
            Te enviamos un enlace a <Text className="font-semibold">{trimmedEmail}</Text>. Ábrelo
            desde este teléfono para entrar.
          </Text>
          <Button title="Usar otro correo" variant="secondary" onPress={() => magicLink.reset()} />
        </View>
      ) : (
        <View className="gap-3">
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            placeholderTextColor="#a3a3a3"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={() => isValidEmail && magicLink.mutate(trimmedEmail)}
            className="h-12 rounded-xl border border-neutral-300 px-4 text-base text-neutral-900 dark:border-neutral-700 dark:text-white"
          />
          <Button
            title="Enviarme un enlace"
            onPress={() => magicLink.mutate(trimmedEmail)}
            disabled={!isValidEmail}
            loading={magicLink.isPending}
          />
          {isGoogleAuthEnabled ? (
            <Button
              title="Continuar con Google"
              variant="secondary"
              onPress={() => google.mutate()}
              loading={google.isPending}
            />
          ) : null}
        </View>
      )}

      {error ? <Text className="mt-4 text-sm text-red-600">{error.message}</Text> : null}
    </KeyboardAvoidingView>
  );
}
