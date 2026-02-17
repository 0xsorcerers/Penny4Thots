import { useState, useEffect } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark') || 
                          document.body.classList.contains('dark');
      setIsDark(hasDarkClass);
    };

    // Check initial theme
    checkTheme();

    // Set up observer to detect theme changes
    const observer = new MutationObserver(() => {
      checkTheme();
    });

    // Observe both html and body for class changes
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return { isDark, isLight: !isDark };
}
