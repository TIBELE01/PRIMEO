// permissions: request and check device permissions
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';

export const permissions = {
  requestLocation: async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  },

  requestCamera: async (): Promise<boolean> => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    return status === 'granted';
  },

  requestMediaLibrary: async (): Promise<boolean> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  },

  requestNotifications: async (): Promise<boolean> => {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },
};
