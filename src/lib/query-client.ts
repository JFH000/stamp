import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
    },
  },
});

// En móvil, "volver a la app" cuenta como foco: las queries viejas se refrescan.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    focusManager.setFocused(state === 'active');
  });
}
