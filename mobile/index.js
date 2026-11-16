// Entry point registered with Expo / Metro bundler
import { registerRootComponent } from 'expo';

// Web : rétablit l'adresse demandée avant un rechargement (voir public/404.html), pour que
// la navigation rouvre le bon écran au lieu d'afficher « Not Found ».
if (typeof window !== 'undefined' && window.sessionStorage && window.history) {
  try {
    const target = window.sessionStorage.getItem('primeo_deeplink');
    if (target) {
      window.sessionStorage.removeItem('primeo_deeplink');
      if (target.startsWith('/') && target !== '/') window.history.replaceState(null, '', target);
    }
  } catch { /* stockage indisponible : on démarre normalement */ }
}

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately.
registerRootComponent(App);
