// src/components/Logo.tsx
interface LogoProps {
  size?: number;
  showText?: boolean;
}

export function Logo({ size = 36, showText = true }: LogoProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      {/* Inline SVG recreation of the SmartSplit icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <rect width="100" height="100" rx="24" fill="url(#bg-grad)" />
        {/* Left purple half */}
        <path
          d="M0 24C0 10.7 10.7 0 24 0H50V100H24C10.7 100 0 89.3 0 76V24Z"
          fill="#9F9DF3"
        />
        {/* Right pink half */}
        <path
          d="M50 0H76C89.3 0 100 10.7 100 24V76C100 89.3 89.3 100 76 100H50V0Z"
          fill="#FF9BB3"
        />
        {/* White swirl S shape */}
        <path
          d="M62 18C62 18 72 22 72 34C72 46 58 46 50 50C42 54 28 54 28 66C28 78 38 82 38 82"
          stroke="white"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Green coin circle */}
        <circle cx="50" cy="50" r="15" fill="white" />
        <circle cx="50" cy="50" r="12" fill="#C9EBCA" />
        <text
          x="50"
          y="55"
          textAnchor="middle"
          fill="#3a7a3c"
          fontSize="13"
          fontWeight="700"
          fontFamily="sans-serif"
        >
          $
        </text>
        <defs>
          <linearGradient id="bg-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9F9DF3" />
            <stop offset="1" stopColor="#FF9BB3" />
          </linearGradient>
        </defs>
      </svg>
      {showText && (
        <span style={{ fontSize: size * 0.44, fontWeight: 800, lineHeight: 1, color: '#2D2A5E' }}>
          Smart<span style={{ color: '#FF9BB3' }}>Split</span>
        </span>
      )}
    </div>
  );
}
