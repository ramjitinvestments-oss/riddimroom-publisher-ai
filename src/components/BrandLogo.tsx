import React from 'react';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function BrandLogo({ size = 'md', showText = true, className = '' }: BrandLogoProps) {
  const sizeMap = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-36 h-36',
    xl: 'w-48 h-48',
  };

  const containerClass = `flex items-center gap-3 ${className}`;

  return (
    <div className={containerClass}>
      {/* SVG Circular Emblem */}
      <div className={`${sizeMap[size]} relative shrink-0 drop-shadow-[0_10px_15px_rgba(16,185,129,0.15)]`}>
        <svg
          viewBox="0 0 500 500"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Gradients */}
            <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0a3c26" />
              <stop offset="65%" stopColor="#041b11" />
              <stop offset="100%" stopColor="#020d08" />
            </radialGradient>
            
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="30%" stopColor="#FFFbeb" />
              <stop offset="70%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#9A3412" />
            </linearGradient>

            <linearGradient id="sunsetGrad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#EA580C" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#FEF08A" />
            </linearGradient>

            <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>

            <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FFE082" />
              <stop offset="50%" stopColor="#F5D033" />
              <stop offset="100%" stopColor="#B8860B" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            
            <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feColorMatrix type="matrix" values="0 0 0 0 0.06   0 0 0 0 0.72   0 0 0 0 0.5   0 0 0 0.4 0" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Outer Ring */}
          <circle cx="250" cy="250" r="240" fill="url(#bgGrad)" stroke="url(#goldGrad)" strokeWidth="6" />
          
          {/* Inner Golden Dotted Ring */}
          <circle cx="250" cy="250" r="226" fill="none" stroke="#F59E0B" strokeWidth="3" strokeDasharray="6 10" opacity="0.6" />
          
          {/* Inner solid border */}
          <circle cx="250" cy="250" r="220" fill="none" stroke="url(#goldGrad)" strokeWidth="2" opacity="0.4" />

          {/* --- TOP HALF: SUNSET, PALM TREE, WAVES --- */}
          <g clipPath="url(#topClip)">
            <clipPath id="topClip">
              <circle cx="250" cy="250" r="218" />
            </clipPath>
            
            {/* Sunset Sky and Sun */}
            <rect x="30" y="30" width="440" height="240" fill="url(#sunsetGrad)" />
            <circle cx="270" cy="180" r="65" fill="#FEF08A" opacity="0.9" filter="blur(2px)" />

            {/* Ocean Waves */}
            <path
              d="M30,220 C100,200 150,250 220,210 C290,170 340,240 410,215 C440,205 450,215 470,220 L470,260 L30,260 Z"
              fill="url(#oceanGrad)"
              opacity="0.85"
            />
            <path
              d="M30,230 C80,215 130,240 190,225 C250,210 320,235 380,220 C420,210 440,225 470,230 L470,260 L30,260 Z"
              fill="#065F46"
              opacity="0.9"
            />

            {/* Flying Birds Silhouettes */}
            <path d="M280,105 Q290,95 300,105 Q310,95 320,105 Q310,100 300,105 Q290,100 280,105 Z" fill="#041B11" opacity="0.75" />
            <path d="M330,115 Q337,108 345,115 Q352,108 360,115 Q352,111 345,115 Q337,111 330,115 Z" fill="#041B11" opacity="0.75" />
            <path d="M250,118 Q255,113 260,118 Q265,113 270,118 Q265,115 260,118 Q255,115 250,118 Z" fill="#041B11" opacity="0.75" />

            {/* Palm Tree Left */}
            <g transform="translate(80, 50)">
              {/* Trunk */}
              <path d="M50,170 Q45,110 95,45 Q90,110 58,170 Z" fill="#041B11" />
              {/* Leaves */}
              <path d="M95,45 Q80,20 40,25 Q70,35 95,45 Z" fill="#022C22" />
              <path d="M95,45 Q90,10 65,-5 Q85,15 95,45 Z" fill="#064E3B" />
              <path d="M95,45 Q120,15 140,5 Q115,25 95,45 Z" fill="#022C22" />
              <path d="M95,45 Q130,40 150,55 Q120,50 95,45 Z" fill="#064E3B" />
              <path d="M95,45 Q110,70 120,95 Q105,70 95,45 Z" fill="#047857" />
              <path d="M95,45 Q65,65 45,85 Q65,55 95,45 Z" fill="#047857" />
            </g>
          </g>

          {/* --- MIDDLE BRAND BANNER PANEL --- */}
          {/* Black Banner Backing */}
          <rect x="25" y="245" width="450" height="95" rx="16" fill="#04130C" stroke="url(#goldGrad)" strokeWidth="4.5" filter="drop-shadow(0 10px 10px rgba(0,0,0,0.5))" />
          
          {/* Inner banner gold pinstripe */}
          <rect x="33" y="253" width="434" height="79" rx="10" fill="none" stroke="#F59E0B" strokeWidth="1.2" opacity="0.6" />

          {/* RIDDIMROOM.COM TEXT */}
          <text
            x="250"
            y="288"
            fontFamily="Impact, sans-serif"
            fontWeight="bold"
            fontSize="38"
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="2"
          >
            RIDDIMROOM.COM
          </text>

          {/* PUBLISHER AI TEXT */}
          <text
            x="250"
            y="323"
            fontFamily="Impact, Arial Black, sans-serif"
            fontWeight="bold"
            fontSize="32"
            fill="url(#goldTextGrad)"
            textAnchor="middle"
            letterSpacing="3.5"
            filter="url(#goldGlow)"
          >
            PUBLISHER AI
          </text>

          {/* Sub banner label */}
          <rect x="60" y="348" width="380" height="26" rx="13" fill="#030712" stroke="url(#goldGrad)" strokeWidth="1.5" />
          <circle cx="75" cy="361" r="4" fill="#F59E0B" />
          <text
            x="250"
            y="365"
            fontFamily="Arial, sans-serif"
            fontWeight="900"
            fontSize="10"
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="1"
          >
            GENERATE KDP PUZZLE BOOKS WITH AI
          </text>
          <circle cx="425" cy="361" r="4" fill="#F59E0B" />


          {/* --- BOTTOM PORTION: MUSIC CARDS, HEADPHONES, PUZZLES, FEATHER --- */}
          
          {/* Golden Music Notes Cards (top-right side overlaying wave margin) */}
          <g transform="translate(325, 125) rotate(12)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))">
            <rect x="0" y="0" width="45" height="65" rx="6" fill="#042F1A" stroke="url(#goldGrad)" strokeWidth="2.5" />
            <path d="M12,45 C12,38 20,38 20,45 C20,52 12,52 12,45 Z M20,40 L20,15 L32,20 L32,32 L20,28" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1.5" strokeLinejoin="round" />
          </g>
          <g transform="translate(365, 140) rotate(24)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))">
            <rect x="0" y="0" width="45" height="65" rx="6" fill="#042F1A" stroke="url(#goldGrad)" strokeWidth="2" />
            <path d="M12,45 C12,38 20,38 20,45" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="45" r="4" fill="#F59E0B" />
            <line x1="16" y1="45" x2="16" y2="18" stroke="#F59E0B" strokeWidth="2" />
            <line x1="16" y1="18" x2="28" y2="24" stroke="#F59E0B" strokeWidth="2" />
          </g>

          {/* Headset wrapped left-middle */}
          <g transform="translate(15, 145)" filter="drop-shadow(0 5px 8px rgba(0,0,0,0.4))">
            {/* Arch headband */}
            <path d="M10,90 Q40,0 100,50" fill="none" stroke="url(#goldGrad)" strokeWidth="12" strokeLinecap="round" />
            <path d="M12,88 Q40,5 98,48" fill="none" stroke="#1F2937" strokeWidth="8" strokeLinecap="round" />
            {/* Ear Cup Left */}
            <g transform="translate(-5, 75) rotate(-15)">
              <rect x="0" y="0" width="34" height="60" rx="10" fill="#1F2937" stroke="url(#goldGrad)" strokeWidth="3" />
              <ellipse cx="17" cy="30" rx="10" ry="20" fill="#111827" stroke="#F59E0B" strokeWidth="1" />
              <rect x="-6" y="15" width="8" height="30" rx="2" fill="url(#goldGrad)" />
            </g>
            {/* Adjustment hinge details */}
            <rect x="5" y="65" width="8" height="15" fill="#374151" stroke="url(#goldGrad)" strokeWidth="1" />
          </g>


          {/* --- LOWER THIRD WORKSPACE ELEMENTS (Inside circle bounds) --- */}
          <g transform="translate(100, 390)">
            {/* Sudoku Notepad / spiral book (left bottom) */}
            <g transform="translate(-15, 0) rotate(-10)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))">
              <rect x="0" y="0" width="100" height="90" rx="8" fill="#F9FAF7" stroke="#1E293B" strokeWidth="2.5" />
              <line x1="33" y1="0" x2="33" y2="90" stroke="#CBD5E1" strokeWidth="1" />
              <line x1="66" y1="0" x2="66" y2="90" stroke="#CBD5E1" strokeWidth="1" />
              <line x1="0" y1="30" x2="100" y2="30" stroke="#CBD5E1" strokeWidth="1" />
              <line x1="0" y1="60" x2="100" y2="60" stroke="#CBD5E1" strokeWidth="1" />
              {/* Small mock grid numbers */}
              <text x="16" y="20" fontSize="11" fontWeight="bold" fill="#0F172A" textAnchor="middle">5</text>
              <text x="50" y="20" fontSize="11" fontWeight="bold" fill="#0F172A" textAnchor="middle">8</text>
              <text x="83" y="50" fontSize="11" fontWeight="bold" fill="#0F172A" textAnchor="middle">3</text>
              <text x="16" y="80" fontSize="11" fontWeight="bold" fill="#0F172A" textAnchor="middle">1</text>
              {/* Spiral rings */}
              <circle cx="-3" cy="15" r="3" fill="#94A3B8" />
              <circle cx="-3" cy="35" r="3" fill="#94A3B8" />
              <circle cx="-3" cy="55" r="3" fill="#94A3B8" />
              <circle cx="-3" cy="75" r="3" fill="#94A3B8" />
              <path d="M-3,15 Q6,12 -3,22" fill="none" stroke="#475569" strokeWidth="2" />
              <path d="M-3,35 Q6,32 -3,42" fill="none" stroke="#475569" strokeWidth="2" />
              <path d="M-3,55 Q6,52 -3,62" fill="none" stroke="#475569" strokeWidth="2" />
              <path d="M-3,75 Q6,72 -3,82" fill="none" stroke="#475569" strokeWidth="2" />
            </g>

            {/* AI Emerald Hardcover Book (center bottom) */}
            <g transform="translate(85, -5) rotate(0)" filter="drop-shadow(0 6px 12px rgba(16,185,129,0.3))">
              <rect x="0" y="0" width="85" height="100" rx="8" fill="url(#oceanGrad)" stroke="url(#goldGrad)" strokeWidth="3" />
              <rect x="12" y="12" width="61" height="76" rx="4" fill="#042716" stroke="#10B981" strokeWidth="1" />
              
              {/* Circuit design lines in gold */}
              <path d="M20,30 L35,30 L42,38 L42,50" fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0.5" />
              <path d="M65,70 L50,70 L42,62 L42,50" fill="none" stroke="#F59E0B" strokeWidth="1" opacity="0.5" />
              <circle cx="20" cy="30" r="2.5" fill="#F59E0B" />
              <circle cx="65" cy="70" r="2.5" fill="#F59E0B" />

              {/* AI Badge */}
              <rect x="25" y="38" width="35" height="24" rx="4" fill="#061D13" stroke="url(#goldGrad)" strokeWidth="1.5" />
              <text x="42.5" y="55" fontFamily="Arial Black, sans-serif" fontWeight="900" fontSize="13" fill="#10B981" textAnchor="middle" filter="url(#emeraldGlow)">AI</text>
            </g>

            {/* Crossword puzzle grid card (right bottom) */}
            <g transform="translate(165, 10) rotate(12)" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.4))">
              <rect x="0" y="0" width="75" height="85" rx="6" fill="#FFFFFF" stroke="#1F2937" strokeWidth="2" />
              <rect x="6" y="6" width="63" height="63" fill="none" stroke="#E2E8F0" strokeWidth="1.5" />
              {/* Crossword black blocks */}
              <rect x="6" y="6" width="15" height="15" fill="#111827" />
              <rect x="36" y="21" width="15" height="15" fill="#111827" />
              <rect x="51" y="51" width="15" height="15" fill="#111827" />
              <rect x="21" y="36" width="15" height="15" fill="#111827" />
              {/* grid lines */}
              <line x1="21" y1="6" x2="21" y2="69" stroke="#94A3B8" strokeWidth="1" />
              <line x1="36" y1="6" x2="36" y2="69" stroke="#94A3B8" strokeWidth="1" />
              <line x1="51" y1="6" x2="51" y2="69" stroke="#94A3B8" strokeWidth="1" />
              <line x1="6" y1="21" x2="69" y2="21" stroke="#94A3B8" strokeWidth="1" />
              <line x1="6" y1="36" x2="69" y2="36" stroke="#94A3B8" strokeWidth="1" />
              <line x1="6" y1="51" x2="69" y2="51" stroke="#94A3B8" strokeWidth="1" />
              {/* A golden '8' badge at bottom */}
              <circle cx="37.5" cy="74" r="7" fill="#111827" stroke="url(#goldGrad)" strokeWidth="1" />
              <text x="37.5" y="78.5" fontSize="10" fontWeight="900" fill="#F59E0B" textAnchor="middle">8</text>
            </g>

            {/* Green and Gold pen / pencil */}
            <g transform="translate(10, 20) rotate(-35)" filter="drop-shadow(0 3px 4px rgba(0,0,0,0.5))">
              <rect x="0" y="0" width="8" height="75" rx="3" fill="#15803D" stroke="url(#goldGrad)" strokeWidth="1.2" />
              <path d="M0,0 L4,-10 L8,0 Z" fill="#FDE047" stroke="url(#goldGrad)" strokeWidth="1" />
              <polygon points="3,-10 4,-12 5,-10" fill="#1E293B" />
              <rect x="0" y="60" width="8" height="15" fill="#064E3B" />
              <circle cx="4" cy="71" r="2.5" fill="#F59E0B" />
            </g>

            {/* Golden Feather Quill (right bottom accent) */}
            <g transform="translate(255, 30) rotate(42)" filter="drop-shadow(0 3px 5px rgba(0,0,0,0.5))">
              {/* Quill spine */}
              <line x1="0" y1="90" x2="0" y2="0" stroke="url(#goldGrad)" strokeWidth="3" strokeLinecap="round" />
              {/* Feathers */}
              <path d="M0,20 Q-22,35 -15,55 Q-5,65 0,72 Q5,65 15,55 Q22,35 0,20 Z" fill="url(#goldTextGrad)" opacity="0.95" />
              <path d="M0,5 Q-15,15 -10,35 Q-3,45 0,50 Q3,45 10,35 Q15,15 0,5 Z" fill="#FEF08A" opacity="0.5" />
            </g>

            {/* Golden Puzzle Pieces at bottom */}
            <g transform="translate(45, 80) rotate(-5)" filter="drop-shadow(0 3px 4px rgba(0,0,0,0.4))">
              <path
                d="M5,5 L15,5 C17,2 23,2 25,5 L35,5 L35,15 C38,17 38,23 35,25 L35,35 L25,35 C23,38 17,38 15,35 L5,35 L5,25 C2,23 2,17 5,15 Z"
                fill="url(#goldGrad)"
                stroke="#78350F"
                strokeWidth="1.2"
              />
            </g>
            <g transform="translate(105, 85) rotate(15)" filter="drop-shadow(0 3px 4px rgba(0,0,0,0.4))">
              <path
                d="M5,5 L15,5 C17,2 23,2 25,5 L35,5 L35,15 C38,17 38,23 35,25 L35,35 L25,35 C23,38 17,38 15,35 L5,35 L5,25 C2,23 2,17 5,15 Z"
                fill="url(#goldGrad)"
                stroke="#78350F"
                strokeWidth="1"
              />
            </g>
          </g>

        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
            RiddimRoom <span className="text-[#10B981] font-normal font-display">Publisher AI</span>
          </h1>
          <p className="text-[9px] text-[#D4AF37] font-bold tracking-widest uppercase mt-1">
            KDP Tropical Book Suite
          </p>
        </div>
      )}
    </div>
  );
}
