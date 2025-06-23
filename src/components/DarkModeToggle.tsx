import React, { useEffect, useState } from 'react';

const DarkModeToggle: React.FC = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (savedMode !== null) {
        setDarkMode(savedMode === 'true');
      } else {
        setDarkMode(prefersDark);
      }
    }
  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    if (mounted) {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }
  }, [darkMode, mounted]);

  // Prevent rendering the toggle on the server to avoid hydration mismatch for the initial icon
  if (!mounted) {
    return null;
  }

  return (
    <button
      className="fixed bottom-6 left-6 w-12 h-12 rounded-full bg-white dark:bg-gray-700 shadow flex items-center justify-center z-50 hover:rotate-12 transition-transform"
      onClick={() => setDarkMode((prev) => !prev)}
      aria-label="Toggle dark mode"
    >
      <span className="material-symbols-outlined text-gray-600 dark:text-yellow-300">
        {darkMode ? 'brightness_4' : 'brightness_7'}
      </span>
    </button>
  );
};

export default DarkModeToggle;
