import React from 'react';

interface AppLogoIconProps {
  className?: string;
  size?: number | string;
  withShadow?: boolean;
}

export const AppLogoIcon: React.FC<AppLogoIconProps> = ({
  className = 'w-9 h-9',
  size,
  withShadow = true,
}) => {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} rounded-[23%] ${
        withShadow ? 'shadow-md shadow-red-500/20 ring-1 ring-red-500/30' : ''
      } shrink-0`}
      style={size ? { width: size, height: size } : undefined}
    >
      {/* Red App Icon Squircle Background */}
      <rect width="512" height="512" rx="118" fill="#E60012" />

      {/* Scaled & Centered Book + Cross Group */}
      <g transform="translate(256 256) scale(1.68) translate(-256 -252)">
        {/* Behind Page Shadows / Outer Book Edge Underlay */}
        {/* Left Underlay Page Layer */}
        <path
          d="M 148 215 C 148 215 180 210 220 216 L 220 278 C 180 272 148 277 148 277 Z"
          fill="#FFFFFF"
          opacity="0.9"
        />
        {/* Right Underlay Page Layer */}
        <path
          d="M 364 215 C 364 215 332 210 292 216 L 292 278 C 332 272 364 277 364 277 Z"
          fill="#FFFFFF"
          opacity="0.9"
        />

        {/* Main Left Open Page */}
        <path
          d="M 158 206 C 158 206 188 200 224 207 L 224 272 C 188 266 158 271 158 271 Z"
          fill="#FFFFFF"
        />
        {/* Main Right Open Page */}
        <path
          d="M 354 206 C 354 206 324 200 288 207 L 288 272 C 324 266 354 271 354 271 Z"
          fill="#FFFFFF"
        />

        {/* Page Content Lines - Left Page */}
        <g stroke="#E60012" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
          <line x1="172" y1="219" x2="216" y2="221" />
          <line x1="172" y1="225.5" x2="216" y2="227.5" />
          <line x1="172" y1="232" x2="216" y2="234" />
          <line x1="172" y1="238.5" x2="216" y2="240.5" />
          <line x1="172" y1="245" x2="216" y2="247" />
          <line x1="172" y1="251.5" x2="216" y2="253.5" />
          <line x1="172" y1="258" x2="216" y2="260" />
        </g>

        {/* Page Content Lines - Right Page */}
        <g stroke="#E60012" strokeWidth="2.2" strokeLinecap="round" opacity="0.85">
          <line x1="296" y1="221" x2="340" y2="219" />
          <line x1="296" y1="227.5" x2="340" y2="225.5" />
          <line x1="296" y1="234" x2="340" y2="232" />
          <line x1="296" y1="240.5" x2="340" y2="238.5" />
          <line x1="296" y1="247" x2="340" y2="245" />
          <line x1="296" y1="253.5" x2="340" y2="251.5" />
          <line x1="296" y1="260" x2="340" y2="258" />
        </g>

        {/* Center Plaque / Card on Spine */}
        <rect
          x="220"
          y="218"
          width="72"
          height="100"
          rx="2"
          fill="#FFFFFF"
          stroke="#E60012"
          strokeWidth="3.5"
        />
        {/* Inner hairline border */}
        <rect
          x="223"
          y="221"
          width="66"
          height="94"
          rx="1"
          fill="none"
          stroke="#E60012"
          strokeWidth="1.2"
          opacity="0.75"
        />

        {/* Ornate Trefoil Cross */}
        <g fill="#E60012" stroke="#E60012">
          {/* Main Vertical Shaft */}
          <rect x="253.25" y="235" width="5.5" height="58" rx="1.5" />

          {/* Main Horizontal Beam */}
          <rect x="236" y="247.25" width="40" height="5.5" rx="1.5" />

          {/* Center Intersection Ring / Diamond */}
          <circle cx="256" cy="250" r="5" fill="#E60012" />
          <circle cx="256" cy="250" r="2.2" fill="#FFFFFF" />

          {/* Top Arm Trefoil */}
          <circle cx="256" cy="232" r="3.2" />
          <circle cx="251.5" cy="235.5" r="3" />
          <circle cx="260.5" cy="235.5" r="3" />

          {/* Left Arm Trefoil */}
          <circle cx="233" cy="250" r="3.2" />
          <circle cx="236.5" cy="245.5" r="3" />
          <circle cx="236.5" cy="254.5" r="3" />

          {/* Right Arm Trefoil */}
          <circle cx="279" cy="250" r="3.2" />
          <circle cx="275.5" cy="245.5" r="3" />
          <circle cx="275.5" cy="254.5" r="3" />

          {/* Bottom Arm Collar */}
          <rect x="251" y="287" width="10" height="2.5" rx="1" />

          {/* Bottom Arm Trefoil Base */}
          <circle cx="256" cy="295" r="3.4" />
          <circle cx="251" cy="291.5" r="3" />
          <circle cx="261" cy="291.5" r="3" />

          {/* Decorative corner points around center */}
          <circle cx="249" cy="243" r="1.5" />
          <circle cx="263" cy="243" r="1.5" />
          <circle cx="249" cy="257" r="1.5" />
          <circle cx="263" cy="257" r="1.5" />
        </g>
      </g>
    </svg>
  );
};
