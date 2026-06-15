// ImageGallery (PropertyDetail): carrousel + visionneuse plein écran au tap.
import React, { useState } from 'react';
import { PropertyImageGallery } from '../../../../components/property/PropertyImageGallery';
import { FullscreenImageViewer } from '../../../../components/property/FullscreenImageViewer';

interface ImageGalleryProps {
  images: string[];
  width?: number;
  height?: number;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({ images, width, height }) => {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  return (
    <>
      <PropertyImageGallery
        images={images}
        onImagePress={(index) => setViewerIndex(index)}
        width={width}
        height={height}
      />
      <FullscreenImageViewer
        visible={viewerIndex !== null}
        images={images}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />
    </>
  );
};
