import './LoadingSpinner.css';

export default function LoadingSpinner({ size = 96, label }) {
  return (
    <div className="loading-spinner-wrap">
      <div className="loading-spinner" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="loading-spinner__sparkle loading-spinner__sparkle--a">
          <path d="M50 6 L54 10 L50 14 L46 10 Z" fill="#f3e4b8" stroke="#1a1108" strokeWidth="1.5" />
        </svg>
        <svg viewBox="0 0 100 100" className="loading-spinner__sparkle loading-spinner__sparkle--b">
          <path d="M36 84 L40 88 L36 92 L32 88 Z" fill="#c9a961" stroke="#1a1108" strokeWidth="1.5" />
        </svg>

        <svg viewBox="0 0 100 100" className="loading-spinner__ring">
          <defs>
            <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f3e4b8" />
              <stop offset="55%" stopColor="#c9a961" />
              <stop offset="100%" stopColor="#9c7c3b" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r="40" fill="none" stroke="#1a1108" strokeWidth="12" opacity="0.35" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="url(#spinnerGradient)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="130 251"
          />
        </svg>

        <svg viewBox="0 0 100 100" className="loading-spinner__spade">
          <path
            d="M50 18 C67 36 80 50 80 64 C80 76 69 84 58 79 C60 86 65 90 72 92 L28 92 C35 90 40 86 42 79 C31 84 20 76 20 64 C20 50 33 36 50 18 Z"
            fill="#d9b871"
            stroke="#1a1108"
            strokeWidth="4"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {label && <div className="loading-spinner__label">{label}</div>}
    </div>
  );
}
