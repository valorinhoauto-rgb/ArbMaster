import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className, size = 40 }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
        <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      
      {/* Base Circle with Gradient */}
      <circle cx="50" cy="50" r="48" fill="url(#logo-grad)" />
      
      {/* Hexagonal Accent */}
      <path 
        d="M50 15 L80 32.5 V67.5 L50 85 L20 67.5 V32.5 Z" 
        stroke="white" 
        strokeWidth="1" 
        opacity="0.15" 
        fill="none" 
      />
      
      {/* Arbitrage Arrows */}
      <g filter="url(#logo-glow)">
        {/* Arrow 1 - Up Right */}
        <path 
          d="M32 68 L62 38 M62 38 H48 M62 38 V52" 
          stroke="white" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* Arrow 2 - Down Left */}
        <path 
          d="M68 32 L38 62 M38 62 H52 M38 62 V48" 
          stroke="white" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          opacity="0.9"
        />
      </g>
      
      {/* Decorative Dots */}
      <circle cx="50" cy="50" r="3" fill="white" />
      <circle cx="50" cy="20" r="1.5" fill="white" opacity="0.4" />
      <circle cx="50" cy="80" r="1.5" fill="white" opacity="0.4" />
      <circle cx="20" cy="50" r="1.5" fill="white" opacity="0.4" />
      <circle cx="80" cy="50" r="1.5" fill="white" opacity="0.4" />
    </svg>
  );
}
