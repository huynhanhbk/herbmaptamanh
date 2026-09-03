import React from 'react';

interface HerbMapLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'full' | 'icon';
  alt?: string;
}

export const HerbMapLogo: React.FC<HerbMapLogoProps> = ({
  className = '',
  size = 40,
  variant = 'icon',
  alt = 'HerbMap Tam Anh Logo',
}) => {
  // If variant === 'icon', we show the circular emblem (pin, leaves, book, ring) optimized for square avatars/headers/favicons
  // If variant === 'full', we show the complete logo with the HERBMAP - TAM ANH - typography and framing arc
  const viewBox = variant === 'icon' ? '30 30 440 330' : '0 0 500 500';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={alt}
    >
      <defs>
        {/* Left Outer Arc Gradient: Yellow -> Lime -> Forest Green */}
        <linearGradient id="herbmap-arc-left" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="35%" stopColor="#EAB308" />
          <stop offset="70%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>

        {/* Right Outer Arc Gradient: Yellow -> Cyan -> Ocean Blue */}
        <linearGradient id="herbmap-arc-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="25%" stopColor="#06B6D4" />
          <stop offset="60%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>

        {/* Left Leaf Gradient: Vibrant Lime to Bright Leaf Green */}
        <linearGradient id="herbmap-leaf-left" x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor="#84CC16" />
          <stop offset="55%" stopColor="#65A30D" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>

        {/* Right Leaf Gradient: Rich Emerald to Teal Green */}
        <linearGradient id="herbmap-leaf-right" x1="90%" y1="10%" x2="10%" y2="90%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        {/* Book Left Page Grid Map Terrain */}
        <linearGradient id="herbmap-page-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#16A34A" />
          <stop offset="60%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>

        {/* Book Right Page Grid Map Terrain */}
        <linearGradient id="herbmap-page-right" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#16A34A" />
          <stop offset="60%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>

        {/* Center River Gradient */}
        <linearGradient id="herbmap-river" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="45%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>

        {/* Pin Left Half (Amber) */}
        <linearGradient id="herbmap-pin-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>

        {/* Pin Right Half (Green) */}
        <linearGradient id="herbmap-pin-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#65A30D" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>

        {/* Filter for crisp drop glow in dark/light themes */}
        <filter id="herbmap-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* ================= 1. CIRCULAR ENCLOSING ARCS ================= */}
      <g id="outer-circle-ring" filter="url(#herbmap-glow)">
        {/* Left Arc: from top-center (x:248, y:58) counter-clockwise down to (x:105, y:310) */}
        <path
          d="M 248 58 A 178 178 0 0 0 105 310"
          fill="none"
          stroke="url(#herbmap-arc-left)"
          strokeWidth="11"
          strokeLinecap="round"
        />

        {/* Right Arc: from top-center (x:252, y:58) clockwise down to (x:395, y:310) */}
        <path
          d="M 252 58 A 178 178 0 0 1 395 310"
          fill="none"
          stroke="url(#herbmap-arc-right)"
          strokeWidth="11"
          strokeLinecap="round"
        />
      </g>

      {/* ================= 2. OPEN BOOK / SURVEY MAP GRID ================= */}
      <g id="open-map-book">
        {/* Left Book Page (Open Map) */}
        <path
          d="M 246 254 L 155 228 C 145 225 132 232 128 244 L 115 304 C 113 313 120 320 128 320 L 234 316 C 242 316 246 312 246 304 Z"
          fill="url(#herbmap-page-left)"
          stroke="#0A4D2E"
          strokeWidth="7"
          strokeLinejoin="round"
        />

        {/* Left Page Map Quadrant Dividers (White Grid Panes) */}
        {/* Horizontal latitude grid line */}
        <path
          d="M 121 276 C 160 274 200 278 246 282"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.95"
        />
        {/* Vertical longitude grid line */}
        <path
          d="M 183 234 L 174 318"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.95"
        />

        {/* Right Book Page (Open Map) */}
        <path
          d="M 254 254 L 345 228 C 355 225 368 232 372 244 L 385 304 C 387 313 380 320 372 320 L 266 316 C 258 316 254 312 254 304 Z"
          fill="url(#herbmap-page-right)"
          stroke="#0A4D2E"
          strokeWidth="7"
          strokeLinejoin="round"
        />

        {/* Right Page Map Quadrant Dividers (White Grid Panes) */}
        {/* Horizontal latitude grid line */}
        <path
          d="M 254 282 C 300 278 340 274 379 276"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.95"
        />
        {/* Vertical longitude grid line */}
        <path
          d="M 317 234 L 326 318"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="4.5"
          strokeLinecap="round"
          opacity="0.95"
        />

        {/* River Spanning Down Center Spine (Flowing Blue Water) */}
        <path
          d="M 249 255 C 248 268 244 280 246 295 C 247 304 240 310 234 317 C 246 319 258 319 267 317 C 260 309 254 302 254 294 C 254 281 251 268 251 255 Z"
          fill="url(#herbmap-river)"
          stroke="#0284C7"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>

      {/* ================= 3. MEDICINAL PLANT LEAVES SPROUTING ================= */}
      <g id="medicinal-leaves">
        {/* Central Stem connecting to the book spine */}
        <path
          d="M 250 258 L 250 185"
          fill="none"
          stroke="#0A4D2E"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* Left Botanical Leaf */}
        <path
          d="M 250 252 C 220 250 160 220 148 136 C 185 140 235 180 250 252 Z"
          fill="url(#herbmap-leaf-left)"
          stroke="#0A4D2E"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Left Leaf White Center Vein (Midrib) */}
        <path
          d="M 245 240 C 225 210 185 168 152 140"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.95"
        />

        {/* Right Botanical Leaf */}
        <path
          d="M 250 252 C 280 250 340 220 352 136 C 315 140 265 180 250 252 Z"
          fill="url(#herbmap-leaf-right)"
          stroke="#0A4D2E"
          strokeWidth="4.5"
          strokeLinejoin="round"
        />
        {/* Right Leaf White Center Vein (Midrib) */}
        <path
          d="M 255 240 C 275 210 315 168 348 140"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.95"
        />
      </g>

      {/* ================= 4. GPS LOCATION PIN ================= */}
      <g id="gps-location-pin" filter="url(#herbmap-glow)">
        {/* Left Half of Pin (Yellow-Amber) */}
        <path
          d="M 250 88 C 234 88 221 101 221 118 C 221 138 245 165 250 173 L 250 88 Z"
          fill="url(#herbmap-pin-left)"
        />

        {/* Right Half of Pin (Green) */}
        <path
          d="M 250 88 C 266 88 279 101 279 118 C 279 138 255 165 250 173 L 250 88 Z"
          fill="url(#herbmap-pin-right)"
        />

        {/* Outer Pin Outline */}
        <path
          d="M 250 88 C 234 88 221 101 221 118 C 221 138 245 165 250 173 C 255 165 279 138 279 118 C 279 101 266 88 250 88 Z"
          fill="none"
          stroke="#0A4D2E"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Inner Pin White Circle Dot */}
        <circle
          cx="250"
          cy="118"
          r="14"
          fill="#FFFFFF"
          stroke="#0A4D2E"
          strokeWidth="2.5"
        />
        {/* Center Target Point */}
        <circle
          cx="250"
          cy="118"
          r="3.5"
          fill="#0A4D2E"
        />
      </g>

      {/* ================= 5. FULL VARIANT: TYPOGRAPHY & FRAMING ARC ================= */}
      {variant === 'full' && (
        <g id="branding-typography">
          {/* Main Title: HERBMAP */}
          <text
            x="250"
            y="370"
            textAnchor="middle"
            fill="#0A4D2E"
            fontSize="50"
            fontWeight="900"
            letterSpacing="3"
            style={{
              fontFamily: "system-ui, -apple-system, 'Plus Jakarta Sans', Montserrat, sans-serif",
            }}
          >
            HERBMAP
          </text>

          {/* Subtitle: — TAM ANH — */}
          <g>
            {/* Left Dash */}
            <line
              x1="145"
              y1="400"
              x2="175"
              y2="400"
              stroke="#0A4D2E"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* TAM ANH Text */}
            <text
              x="250"
              y="407"
              textAnchor="middle"
              fill="#0A4D2E"
              fontSize="23"
              fontWeight="800"
              letterSpacing="4"
              style={{
                fontFamily: "system-ui, -apple-system, 'Plus Jakarta Sans', Montserrat, sans-serif",
              }}
            >
              TAM ANH
            </text>

            {/* Right Dash */}
            <line
              x1="325"
              y1="400"
              x2="355"
              y2="400"
              stroke="#0A4D2E"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>

          {/* Bottom Framing Arc: beneath the text */}
          <path
            d="M 118 382 C 160 428 215 444 250 444 C 285 444 340 428 382 382"
            fill="none"
            stroke="#0A4D2E"
            strokeWidth="8.5"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
};
