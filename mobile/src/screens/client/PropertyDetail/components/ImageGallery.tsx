// ImageGallery (PropertyDetail): gallery wrapper with expand-to-fullscreen gesture
import React from 'react';
import { PropertyImageGallery } from '../../../../components/property/PropertyImageGallery';

interface ImageGalleryProps {
  images: string[];
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const handlePress = (index: number) => {
    // TODO: open fullscreen modal viewer
  };
  return <PropertyImageGallery images={images} onImagePress={handlePress} />;
};
