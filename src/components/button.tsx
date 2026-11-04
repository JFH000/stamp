import { ActivityIndicator, Pressable, Text } from 'react-native';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      className={`h-12 flex-row items-center justify-center rounded-xl px-5 active:opacity-80 ${
        isPrimary
          ? 'bg-primary dark:bg-primary-dark'
          : 'border border-neutral-300 bg-transparent dark:border-neutral-700'
      } ${isDisabled ? 'opacity-50' : ''}`}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#ffffff' : undefined} />
      ) : (
        <Text
          className={`text-base font-semibold ${
            isPrimary ? 'text-white dark:text-neutral-950' : 'text-neutral-900 dark:text-neutral-100'
          }`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
