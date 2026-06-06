// Web stub for @react-native-community/netinfo
// The native package throws immediately on web because RNCNetInfo is null.
// This stub uses navigator.onLine + window events instead.

const getState = () => ({
  type: navigator.onLine ? 'wifi' : 'none',
  isConnected: navigator.onLine,
  isInternetReachable: navigator.onLine,
  details: null,
});

const NetInfo = {
  addEventListener(listener) {
    const onOnline  = () => listener({ ...getState(), isConnected: true,  isInternetReachable: true  });
    const onOffline = () => listener({ ...getState(), isConnected: false, isInternetReachable: false });
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    // Emit once immediately so callers get the current state
    setTimeout(() => listener(getState()), 0);
    // Return unsubscribe function
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  },

  fetch() {
    return Promise.resolve(getState());
  },

  configure() {},

  useNetInfo() {
    return getState();
  },
};

export default NetInfo;
export const useNetInfo = () => getState();
