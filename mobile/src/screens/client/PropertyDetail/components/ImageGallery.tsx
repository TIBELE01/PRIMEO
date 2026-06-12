// ImageGallery (PropertyDetail): gallery wrapper with expand-to-fullscreen gesture
import React from 'react';
import { PropertyImageGallery } from '../../../../components/property/PropertyImageGallery';

interface ImageGalleryProps {
  images: string[];
  width?: number;
  height?: number;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, width, height }) => {
  const handlePress = (_index: number) => {
    // TODO: open fullscreen modal viewer
  };
  return <PropertyImageGallery images={images} onImagePress={handlePress} width={width} height={height} />;
};
