// VirtualTourButton (PropertyDetail screen): launches the 3D viewer.
// Only renders when the property has virtualTour.available = true.
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { VirtualTourButton as BaseButton } from '../../../../components/property/VirtualTourButton';
import type { VirtualTourData } from '../../../../types/property';
import type { ClientStackParamList } from '../../../../navigation/types';

interface Props {
  virtualTour: VirtualTourData | undefined;
  propertyName: string;
}

export const VirtualTourButton: React.FC<Props> = ({ virtualTour, propertyName }) => {
  const navigation = useNavigation<NativeStackNavigationProp<ClientStackParamList>>();

  if (!virtualTour?.available || !virtualTour.panoramas.length) return null;

  return (
    <BaseButton
      available
      roomCount={virtualTour.panoramas.length}
      onPress={() =>
        navigation.navigate('VirtualTour', {
          panoramas: virtualTour.panoramas,
          propertyName,
        })
      }
    />
  );
};
