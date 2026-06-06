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

  // Garde défensif : panoramas peut être absent même si available=true
  const panoramas = virtualTour?.panoramas ?? [];
  if (!virtualTour?.available || panoramas.length === 0) return null;

  return (
    <BaseButton
      available
      roomCount={panoramas.length}
      onPress={() =>
        navigation.navigate('VirtualTour', {
          panoramas,
          propertyName,
        })
      }
    />
  );
};
