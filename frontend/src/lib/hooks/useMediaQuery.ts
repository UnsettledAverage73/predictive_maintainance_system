'use client';
import { useState, useEffect } from 'react';

export function useMediaQuery() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 639px)');
    const tabletQuery = window.matchMedia('(min-width: 640px) and (max-width: 1023px)');
    const desktopQuery = window.matchMedia('(min-width: 1024px)');

    const updateMatches = () => {
      setIsMobile(mobileQuery.matches);
      setIsTablet(tabletQuery.matches);
      setIsDesktop(desktopQuery.matches);
    };

    updateMatches();

    const handleChange = () => updateMatches();
    
    // Modern API
    if (mobileQuery.addEventListener) {
      mobileQuery.addEventListener('change', handleChange);
      tabletQuery.addEventListener('change', handleChange);
      desktopQuery.addEventListener('change', handleChange);
      
      return () => {
        mobileQuery.removeEventListener('change', handleChange);
        tabletQuery.removeEventListener('change', handleChange);
        desktopQuery.removeEventListener('change', handleChange);
      };
    } else {
      // Fallback for older browsers (e.g. older iOS Safari)
      mobileQuery.addListener(handleChange);
      tabletQuery.addListener(handleChange);
      desktopQuery.addListener(handleChange);
      
      return () => {
        mobileQuery.removeListener(handleChange);
        tabletQuery.removeListener(handleChange);
        desktopQuery.removeListener(handleChange);
      };
    }
  }, []);

  return { isMobile, isTablet, isDesktop };
}
