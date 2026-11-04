import { NativeTabs } from 'expo-router/native-tabs';
import { useColorScheme } from 'react-native';

export default function TabsLayout() {
  const isDark = useColorScheme() === 'dark';

  return (
    <NativeTabs tintColor={isDark ? '#FF8A4C' : '#D9480F'}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="safari" md="explore" />
        <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mapa">
        <NativeTabs.Trigger.Icon sf="map" md="map" />
        <NativeTabs.Trigger.Label>Mapa</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
