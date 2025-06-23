'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface MaterialIconProps {
  icon: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | number; 
  color?: string; 
  variant?: 'outlined' | 'filled' | 'rounded'; 
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700; 
  hoverEffect?: boolean; 
  clickEffect?: boolean; 
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
}

const MaterialIcon = ({
  icon,
  className = '',
  size = 'md',
  color = 'text-black-600',
  variant = 'outlined',
  weight = 400,
  hoverEffect = true,
  clickEffect = true,
  onClick,
}: MaterialIconProps) => {
  const iconRef = useRef<HTMLSpanElement>(null);

  // Map size to Tailwind classes or custom style
  const sizeClass = typeof size === 'string'
    ? {
        sm: 'text-base', // 16px
        md: 'text-2xl', // 24px
        lg: 'text-4xl', // 32px
      }[size]
    : '';

  // Map variant to Material Icons class
  const variantClass = {
    outlined: 'material-symbols-outlined',
    filled: 'material-symbols',
    rounded: 'material-icons-round',
  }[variant];

  useEffect(() => {
    const icon = iconRef.current;
    if (!icon) return;

    const handleMouseEnter = () => {
      gsap.to(icon, {
        scale: 1.2,
        rotation: 10,
        duration: 0.3,
        ease: 'power2.out',
      });
    };
    const handleMouseLeave = () => {
      gsap.to(icon, {
        scale: 1,
        rotation: 0,
        duration: 0.3,
        ease: 'power2.out',
      });
    };
    const handleClick = () => {
      gsap.to(icon, {
        scale: 0.9,
        duration: 0.1,
        ease: 'power1.in',
        yoyo: true,
        repeat: 1,
      });
    };

    if (hoverEffect) {
      icon.addEventListener('mouseenter', handleMouseEnter);
      icon.addEventListener('mouseleave', handleMouseLeave);
    }
    if (clickEffect) {
      icon.addEventListener('click', handleClick);
    }

    return () => {
      if (hoverEffect) {
        icon.removeEventListener('mouseenter', handleMouseEnter);
        icon.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (clickEffect) {
        icon.removeEventListener('click', handleClick);
      }
    };
  }, [hoverEffect, clickEffect]);

  return (
    <span
      ref={iconRef}
      className={`${variantClass} ${color} ${sizeClass} ${className} select-none cursor-pointer transition-colors duration-300`}
      style={{
        ...(typeof size === 'number' ? { fontSize: `${size}px` } : {}),
        fontWeight: weight,
        color: 'currentColor', // Đảm bảo nhận màu từ Tailwind
      }}
      onClick={onClick}
    >
      {icon}
    </span>
  );
};

export { MaterialIcon };