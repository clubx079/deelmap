// components/property/PropertyImageSlider.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getPreferredPhotoUrl } from '@/utils/propertyPhotos';

export function PropertyImageSlider({
  propertyId,
  featureImage,
  propertyStatus,
  onShareClick,
  onImageView,
  photoLimit = null,
  isLoggedIn = false,
  onJoinClick = null,
  onMaybeLater = null
}) {
  const [allImages, setAllImages] = useState(featureImage ? [{ url: featureImage, alt: 'Property feature image' }] : []);
  const [images, setImages] = useState(featureImage ? [{ url: featureImage, alt: 'Property feature image' }] : []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [viewedImages, setViewedImages] = useState(new Set([0]));
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  const thumbnailContainerRef = useRef(null);

  useEffect(() => {
    loadAdditionalImages();
  }, [propertyId]);

  // Re-apply limit when photoLimit changes
  useEffect(() => {
    if (photoLimit && allImages.length > photoLimit) {
      console.log('[PhotoLimit] Applying limit:', photoLimit, 'Total images:', allImages.length);
      setImages(allImages.slice(0, photoLimit));
    } else if (allImages.length > 0) {
      console.log('[PhotoLimit] No limit or below limit. PhotoLimit:', photoLimit, 'Total images:', allImages.length);
      setImages(allImages);
    }
  }, [photoLimit, allImages]);

  useEffect(() => {
    // Track image views
    if (onImageView && viewedImages.size > 0) {
      onImageView(viewedImages.size);
    }
  }, [viewedImages, onImageView]);

  // Auto-scroll thumbnails to keep selected one visible
  useEffect(() => {
    if (showLightbox && thumbnailContainerRef.current) {
      const container = thumbnailContainerRef.current;
      const thumbnailWidth = 120 + 8; // thumbnail width + gap
      const scrollPosition = lightboxIndex * thumbnailWidth - (container.clientWidth / 2) + (thumbnailWidth / 2);

      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [lightboxIndex, showLightbox]);

  const loadAdditionalImages = async () => {
    try {
      const response = await fetch(`/api/property-images?propertyId=${propertyId}`);
      const result = await response.json();

      if (result.success && result.images.length > 0) {
        let finalImages = [];

        if (featureImage) {
          finalImages.push({ url: featureImage, alt: 'Property feature image' });
        }

        const additionalImages = result.images
          .map((img) => {
            const url = getPreferredPhotoUrl(img) || img.image_url;
            return {
              url,
              alt: img.alt_text || 'Property image'
            };
          })
          .filter(img => img.url && img.url !== featureImage);

        finalImages = [...finalImages, ...additionalImages];
        setAllImages(finalImages);

        // Apply photo limit if specified (for special link users)
        if (photoLimit && finalImages.length > photoLimit) {
          setImages(finalImages.slice(0, photoLimit));
        } else {
          setImages(finalImages);
        }
      }
    } catch (error) {
      console.error('Failed to load additional images:', error);
    }
  };

  const nextImage = () => {
    if (transitioning) return;

    // Check if non-logged-in user trying to go beyond 5 photos
    if (!isLoggedIn && currentIndex === images.length - 1 && allImages.length > images.length) {
      setShowJoinPrompt(true);
      return;
    }

    setTransitioning(true);
    setImageError(false);
    setTimeout(() => {
      const newIndex = (currentIndex + 1) % images.length;
      setCurrentIndex(newIndex);
      setViewedImages(prev => new Set([...prev, newIndex]));
      setTransitioning(false);
    }, 300);
  };

  const prevImage = () => {
    if (transitioning) return;
    setTransitioning(true);
    setImageError(false);
    setTimeout(() => {
      const newIndex = (currentIndex - 1 + images.length) % images.length;
      setCurrentIndex(newIndex);
      setViewedImages(prev => new Set([...prev, newIndex]));
      setTransitioning(false);
    }, 300);
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setShowLightbox(true);
    setViewedImages(prev => new Set([...prev, index]));
  };

  const closeLightbox = () => {
    setShowLightbox(false);
  };

  const nextLightboxImage = () => {
    // Check if non-logged-in user trying to go beyond 5 photos
    if (!isLoggedIn && lightboxIndex === images.length - 1 && allImages.length > images.length) {
      closeLightbox();
      setShowJoinPrompt(true);
      return;
    }

    const newIndex = (lightboxIndex + 1) % images.length;
    setLightboxIndex(newIndex);
    setViewedImages(prev => new Set([...prev, newIndex]));
  };

  const prevLightboxImage = () => {
    const newIndex = (lightboxIndex - 1 + images.length) % images.length;
    setLightboxIndex(newIndex);
    setViewedImages(prev => new Set([...prev, newIndex]));
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sold': return 'bg-red-500';
      case 'pending': return 'bg-emerald-500';
      case 'available':
      default: return 'bg-[#b29578]';
    }
  };

  if (images.length === 0) {
    return (
      <div className="relative w-full rounded overflow-hidden bg-gray-100 shadow-lg" style={{ height: '420px' }}>
        <div className="flex items-center justify-center h-full">
          <span className="text-gray-400 text-lg">No images available</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full rounded overflow-hidden bg-gray-100 shadow-lg group" style={{ height: '420px' }}>
        <div 
          className="relative w-full h-full cursor-pointer bg-gray-200"
          onClick={() => openLightbox(currentIndex)}
        >
          {images.map((image, index) => (
            <div
              key={`img-${index}`}
              className="absolute inset-0 transition-opacity duration-300 ease-in-out"
              style={{
                opacity: index === currentIndex ? 1 : 0,
                pointerEvents: index === currentIndex ? 'auto' : 'none'
              }}
            >
              {!imageError || index !== currentIndex ? (
                <img
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (index === currentIndex) {
                      console.error('Image failed to load:', image.url);
                      setImageError(true);
                    }
                  }}
                  onLoad={() => {
                    if (index === currentIndex) {
                      setImageError(false);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-gray-500 text-sm">Failed to load image</p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageError(false);
                      }}
                      className="mt-2 text-[#b29578] text-sm underline"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {!imageError && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-all duration-200 flex items-center justify-center pointer-events-none">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 px-4 py-2 rounded-full text-sm font-medium text-gray-700">
                Click to view full size
              </div>
            </div>
          )}
        </div>

        <div className="absolute top-6 left-6 z-20">
          <span className={`${getStatusColor(propertyStatus)} text-white text-sm font-semibold px-4 py-2 rounded-full shadow-lg`}>
            {propertyStatus?.toUpperCase() || 'AVAILABLE'}
          </span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onShareClick(); }}
          className="absolute top-6 right-6 bg-white/95 hover:bg-white p-3 rounded-full shadow-lg transition-all duration-200 z-20"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <svg className="h-5 w-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all duration-200 z-20"
              aria-label="Previous image"
              disabled={transitioning}
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-3 rounded-full shadow-lg transition-all duration-200 z-20"
              aria-label="Next image"
              disabled={transitioning}
            >
              <ChevronRight size={24} />
            </button>

            <div className="absolute bottom-6 right-6 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium z-20">
              {currentIndex + 1} / {allImages.length}
              {!isLoggedIn && allImages.length > images.length && (
                <span className="ml-2 text-yellow-300">
                  ({allImages.length} total)
                </span>
              )}
            </div>
          </>
        )}

        {/* Show "View More" overlay for non-logged-in users */}
        {!isLoggedIn && allImages.length > images.length && currentIndex === images.length - 1 && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowJoinPrompt(true);
            }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-center pb-20 cursor-pointer z-10"
          >
            <div className="text-center">
              <p className="text-white text-lg font-semibold mb-2">
                {allImages.length - images.length} More Photos Available
              </p>
              <button className="bg-[#b29578] hover:bg-[#9a7e61] text-white px-6 py-3 rounded font-medium transition-colors">
                Join Ableman to View All
              </button>
            </div>
          </div>
        )}
      </div>

      {showLightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-50"
            aria-label="Close lightbox"
          >
            <X size={24} />
          </button>

          {/* Main image area */}
          <div
            className="flex-1 relative flex items-center justify-center p-4 mb-4"
            onClick={(e) => e.stopPropagation()}
          >
            {images.map((image, index) => (
              <img
                key={`lightbox-${index}`}
                src={image.url}
                alt={image.alt}
                className="absolute max-w-full max-h-full object-contain transition-opacity duration-300 ease-in-out"
                style={{
                  opacity: index === lightboxIndex ? 1 : 0,
                  pointerEvents: index === lightboxIndex ? 'auto' : 'none'
                }}
                onError={(e) => {
                  console.error('Lightbox image failed:', image.url);
                }}
              />
            ))}
          </div>

          {images.length > 1 && (
            <>
              {/* Navigation arrows */}
              <button
                onClick={(e) => { e.stopPropagation(); prevLightboxImage(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-50"
                aria-label="Previous image"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextLightboxImage(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-50"
                aria-label="Next image"
              >
                <ChevronRight size={32} />
              </button>

              {/* Thumbnail strip at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-8 pb-4 px-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="max-w-7xl mx-auto">
                  {/* Image counter */}
                  <div className="text-center mb-3">
                    <span className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium inline-block">
                      {lightboxIndex + 1} / {images.length}
                    </span>
                  </div>

                  {/* Thumbnail grid */}
                  <div
                    ref={thumbnailContainerRef}
                    className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent scroll-smooth"
                  >
                    {images.map((image, index) => (
                      <button
                        key={`thumb-${index}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(index);
                          setViewedImages(prev => new Set([...prev, index]));
                        }}
                        className={`flex-shrink-0 relative rounded overflow-hidden transition-all duration-200 ${
                          index === lightboxIndex
                            ? 'opacity-100 scale-105'
                            : 'opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ width: '120px', height: '80px' }}
                      >
                        <img
                          src={image.url}
                          alt={`Thumbnail ${index + 1}`}
                          className={`w-full h-full object-cover ${
                            index === lightboxIndex ? 'ring-[3px] ring-white ring-inset' : ''
                          }`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Join Ableman Modal for Special Link Users */}
      {showJoinPrompt && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowJoinPrompt(false)}
        >
          <div
            className="bg-white rounded p-8 max-w-md w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6">
              <div className="w-16 h-16 bg-[#b29578] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Join Ableman to View All Photos</h2>
              <p className="text-gray-600">
                Sign up for free to access the complete photo gallery with {allImages.length} total images and unlock all property features.
              </p>
            </div>
            <button
              onClick={() => {
                setShowJoinPrompt(false);
                if (onJoinClick) {
                  onJoinClick();
                } else {
                  window.location.href = window.location.pathname; // Fallback: reload without special link
                }
              }}
              className="w-full bg-[#b29578] hover:bg-[#9a7e61] text-white py-4 text-lg font-semibold rounded shadow-lg hover:shadow-xl transition-all duration-200 mb-3"
            >
              Join Ableman For Free
            </button>
            <button
              onClick={() => {
                setShowJoinPrompt(false);
                if (onMaybeLater) {
                  onMaybeLater();
                }
              }}
              className="text-gray-500 hover:text-gray-700 font-medium"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </>
  );
}