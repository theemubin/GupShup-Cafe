import React from 'react';
import './HorizontalImageGallery.css';


const images = [
  new URL('../assets/hero1.jpg', import.meta.url).href,
  new URL('../assets/hero2.jpg', import.meta.url).href,
  new URL('../assets/hero3.jpg', import.meta.url).href,
  new URL('../assets/hero4.jpg', import.meta.url).href,
  new URL('../assets/hero5.jpg', import.meta.url).href,
  new URL('../assets/hero6.jpg', import.meta.url).href,
  new URL('../assets/hero7.jpg', import.meta.url).href,
  new URL('../assets/hero8.jpg', import.meta.url).href,
  new URL('../assets/hero9.jpg', import.meta.url).href,
];

export const HorizontalImageGallery = () => (
  <div className="horizontal-gallery">
    {images.map((src, idx) => (
      <div className="gallery-image-wrapper" key={idx}>
        <img src={src} alt={`Gallery ${idx + 1}`} className="gallery-image" loading="lazy" />
      </div>
    ))}
  </div>
);
