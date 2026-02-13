// /hooks/useCachedImage.js
'use client';
import { useState, useEffect } from 'react';
import { imageCache } from '@/lib/imageCache';

export function useCachedImage(url) {
  const [imageSrc, setImageSrc] = useState(url); // Start with original URL
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let objectUrl = null;

    async function loadImage() {
      try {
        // Try to get from IndexedDB cache first
        const cachedBlob = await imageCache.get(url);
        
        if (cachedBlob && !cancelled) {
          objectUrl = URL.createObjectURL(cachedBlob);
          setImageSrc(objectUrl);
          setFromCache(true);
          setLoading(false);
          return;
        }

        // Not in cache, fetch from network
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
        
        const blob = await response.blob();

        if (!cancelled) {
          // Save to cache in background (don't wait)
          imageCache.set(url, blob).catch(err => 
            console.error('Failed to cache image:', err)
          );

          objectUrl = URL.createObjectURL(blob);
          setImageSrc(objectUrl);
          setFromCache(false);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load image:', error);
        // Fallback to direct URL if everything fails
        if (!cancelled) {
          setImageSrc(url);
          setFromCache(false);
          setLoading(false);
        }
      }
    }

    loadImage();

    // Cleanup function
    return () => {
      cancelled = true;
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [url]);

  return { imageSrc, loading, fromCache };
}