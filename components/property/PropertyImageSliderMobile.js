// components/property/PropertyImageSliderMobile.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getPreferredPhotoUrl } from '@/utils/propertyPhotos';

export function PropertyImageSliderMobile({
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
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [viewedImages, setViewedImages] = useState(new Set([0]));
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);
  
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const thumbnailContainerRef = useRef(null);

  useEffect(() => {
    loadAdditionalImages();
  }, [propertyId]);

  // Re-apply limit when photoLimit changes
  useEffect(() => {
    if (photoLimit && allImages.length > photoLimit) {
      console.log('[PhotoLimit Mobile] Applying limit:', photoLimit, 'Total images:', allImages.length);
      setImages(allImages.slice(0, photoLimit));
    } else if (allImages.length > 0) {
      console.log('[PhotoLimit Mobile] No limit or below limit. PhotoLimit:', photoLimit, 'Total images:', allImages.length);
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
    if (showFullscreen && thumbnailContainerRef.current) {
      const container = thumbnailContainerRef.current;
      const thumbnailWidth = 60 + 6; // thumbnail width + gap (mobile size)
      const scrollPosition = currentIndex * thumbnailWidth - (container.clientWidth / 2) + (thumbnailWidth / 2);

      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [currentIndex, showFullscreen]);

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

    // Check if trying to go beyond limit for special link users
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
    }, 250);
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
    }, 250);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
      if (Math.abs(diffX) > 50) {
        if (diffX > 0) {
          nextImage();
        } else {
          prevImage();
        }
      }
    }
    
    touchStartX.current = 0;
    touchEndX.current = 0;
    touchStartY.current = 0;
    touchEndY.current = 0;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'sold': return 'bg-[#D03839]';
      case 'pending': return 'bg-[#0F6E56]';
      case 'available':
      default: return 'bg-[#737370]';
    }
  };

  if (images.length === 0) {
    return (
      <div className="relative w-full rounded overflow-hidden bg-[#FAFAF8] shadow-lg" style={{ height: '250px' }}>
        <div className="flex items-center justify-center h-full">
          <span className="text-[#A8A8A4]">No images available</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full rounded overflow-hidden bg-[#FAFAF8] shadow-lg" style={{ height: '250px' }}>
        <div 
          className="relative w-full h-full bg-[#E8E8E4]"
          onClick={() => setShowFullscreen(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {images.map((image, index) => (
            <div
              key={`img-${index}`}
              className="absolute inset-0 transition-opacity duration-250 ease-in-out"
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
                <div className="w-full h-full flex items-center justify-center bg-[#E8E8E4]">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-[#A8A8A4] mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-[#737370] text-xs">Failed to load</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Status Badge */}
        <div className="absolute top-4 left-4 z-20">
          <span className={`${getStatusColor(propertyStatus)} text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg`}>
            {propertyStatus?.toUpperCase() || 'AVAILABLE'}
          </span>
        </div>

        {/* Share Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onShareClick(); }}
          className="absolute top-4 right-4 bg-white/95 hover:bg-white p-2 rounded-full shadow-lg z-20"
          style={{ backdropFilter: 'blur(4px)', transition: 'all 0.2s ease' }}
        >
          <svg className="h-4 w-4 text-[#444441]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>

        {/* Navigation */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#1A1816] p-2 rounded-full shadow-lg z-20"
              aria-label="Previous image"
              disabled={transitioning}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-[#1A1816] p-2 rounded-full shadow-lg z-20"
              aria-label="Next image"
              disabled={transitioning}
            >
              <ChevronRight size={20} />
            </button>

            {/* Image Counter - MOVED TO BOTTOM-RIGHT CORNER */}
            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium z-20">
              {currentIndex + 1} / {allImages.length}
            </div>
          </>
        )}

        {/* Show "View More" overlay for special link users */}
        {!isLoggedIn && allImages.length > images.length && currentIndex === images.length - 1 && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setShowJoinPrompt(true);
            }}
            className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-center pb-16 cursor-pointer z-10"
          >
            <div className="text-center px-4">
              <p className="text-white text-base font-semibold mb-2">
                {allImages.length - images.length} More Photos Available
              </p>
              <button className="bg-[#737370] hover:bg-[#9a7e61] text-white px-5 py-2 rounded font-medium transition-colors text-sm">
                Join Ableman to View All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Modal with Swipe */}
      {showFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setShowFullscreen(false)}
        >
          <button
            onClick={() => setShowFullscreen(false)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full z-50"
          >
            <X size={20} />
          </button>

          {/* Main image area */}
          <div
            className="flex-1 relative flex items-center justify-center p-4 mb-2"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {images.map((image, index) => (
              <img
                key={`fullscreen-${index}`}
                src={image.url}
                alt={image.alt}
                className="absolute max-w-full max-h-full object-contain transition-opacity duration-250 ease-in-out"
                style={{
                  opacity: index === currentIndex ? 1 : 0,
                  pointerEvents: index === currentIndex ? 'auto' : 'none'
                }}
              />
            ))}
          </div>

          {images.length > 1 && (
            <>
              {/* Navigation arrows */}
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full z-50"
                disabled={transitioning}
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full z-50"
                disabled={transitioning}
              >
                <ChevronRight size={24} />
              </button>

              {/* Thumbnail strip at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/95 to-transparent pt-6 pb-3 px-3"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Image counter */}
                <div className="text-center mb-2">
                  <span className="bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium inline-block">
                    {currentIndex + 1} / {allImages.length}
                  </span>
                </div>

                {/* Thumbnail grid - mobile optimized */}
                <div
                  ref={thumbnailContainerRef}
                  className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent scroll-smooth"
                >
                  {images.map((image, index) => (
                    <button
                      key={`thumb-mobile-${index}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(index);
                        setViewedImages(prev => new Set([...prev, index]));
                      }}
                      className={`flex-shrink-0 relative rounded overflow-hidden transition-all duration-200 ${
                        index === currentIndex
                          ? 'scale-105 opacity-100'
                          : 'opacity-60'
                      }`}
                      style={{ width: '60px', height: '45px' }}
                    >
                      <img
                        src={image.url}
                        alt={`Thumbnail ${index + 1}`}
                        className={`w-full h-full object-cover ${
                          index === currentIndex ? 'ring-2 ring-white ring-inset' : ''
                        }`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </button>
                  ))}
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
            className="bg-white rounded p-6 max-w-sm w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <div className="w-14 h-14 bg-[#737370] rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1A1816] mb-2">Join Ableman to View All Photos</h2>
              <p className="text-[#444441] text-sm">
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
              className="w-full bg-[#737370] hover:bg-[#9a7e61] text-white py-3 text-base font-semibold rounded shadow-lg hover:shadow-xl transition-all duration-200 mb-2"
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
              className="text-[#737370] hover:text-[#444441] font-medium text-sm"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </>
  );
}