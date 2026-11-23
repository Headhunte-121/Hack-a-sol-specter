/**
 * PaintedArtwork.tsx
 * High-aesthetic, stylized digital painted gouache / watercolor storybook
 * human character illustrations for Suraksha chapters and quiz scenarios.
 * Rendered via rich vector gradients and shapes for zero-latency, crisp 4K scaling.
 */

interface ArtworkProps {
  className?: string
  size?: number
}

// 1. Chapter 1: Alert Indian woman checking OTP on smartphone
export function Chapter1Artwork({ className = '', size = 180 }: ArtworkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`overflow-hidden rounded-2xl ${className}`}
      aria-label="Illustration: Indian woman checking banking OTP on smartphone"
    >
      <defs>
        <radialGradient id="ch1-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fff3e0" />
          <stop offset="60%" stopColor="#fed7aa" />
          <stop offset="100%" stopColor="#ea580c" />
        </radialGradient>
        <linearGradient id="ch1-saree" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="50%" stopColor="#be123c" />
          <stop offset="100%" stopColor="#881337" />
        </linearGradient>
        <linearGradient id="ch1-pallu" x1="0%" y1="0%" x2="100%" y2="80%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="ch1-skin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="70%" stopColor="#fba471" />
          <stop offset="100%" stopColor="#e07a4a" />
        </linearGradient>
        <linearGradient id="ch1-hair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="phone-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>

      {/* Warm Painted Background with Sunlight */}
      <rect width="200" height="200" fill="url(#ch1-bg)" />
      <circle cx="150" cy="50" r="45" fill="#fef08a" opacity="0.4" />

      {/* Village Architecture Silhouette Backdrop */}
      <path d="M0 160 L30 145 L70 160 L120 140 L160 155 L200 135 L200 200 L0 200 Z" fill="#fdba74" opacity="0.45" />

      {/* Woman's Hair Bun & Braids */}
      <circle cx="100" cy="72" r="32" fill="url(#ch1-hair)" />
      <circle cx="126" cy="76" r="14" fill="url(#ch1-hair)" />
      {/* Hair Flower (Gajra) */}
      <circle cx="128" cy="70" r="4" fill="#fef9c3" />
      <circle cx="132" cy="76" r="4" fill="#fef9c3" />
      <circle cx="130" cy="82" r="4" fill="#fef9c3" />

      {/* Neck & Shoulders */}
      <path d="M92 95 L108 95 L112 118 L88 118 Z" fill="url(#ch1-skin)" />

      {/* Face & Head */}
      <ellipse cx="98" cy="74" rx="20" ry="24" fill="url(#ch1-skin)" />
      {/* Front Hair Curls */}
      <path d="M78 68 Q98 48 118 64 Q106 58 92 60 Q82 64 78 68 Z" fill="url(#ch1-hair)" />

      {/* Facial Features (Painted Style) */}
      {/* Bindi */}
      <circle cx="95" cy="67" r="2.2" fill="#b91c1c" />
      {/* Eye & Brow */}
      <path d="M86 67 Q92 64 97 68" stroke="#1e1b4b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <ellipse cx="92" cy="72" rx="3.5" ry="2.2" fill="#0f172a" />
      <circle cx="93" cy="71" r="0.9" fill="#ffffff" />
      {/* Gentle Nose & Calm Mouth */}
      <path d="M96 72 Q98 78 95 80" stroke="#c26338" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M91 85 Q95 87 99 85" stroke="#be123c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      {/* Golden Jhumka Earring */}
      <circle cx="80" cy="78" r="3" fill="#f59e0b" />
      <path d="M78 81 L82 81 L80 87 Z" fill="#d97706" />

      {/* Traditional Indian Saree & Blouse */}
      <path d="M70 120 Q100 110 130 120 L155 200 L45 200 Z" fill="url(#ch1-saree)" />
      {/* Golden Border Zari Pallu */}
      <path d="M85 115 Q115 135 140 200 L115 200 Q95 145 70 122 Z" fill="url(#ch1-pallu)" />
      <path d="M87 117 Q117 137 142 200" stroke="#fef08a" strokeWidth="2" strokeDasharray="3 3" fill="none" />

      {/* Hand Holding Smartphone */}
      {/* Arm */}
      <path d="M62 135 Q75 160 88 175" stroke="url(#ch1-skin)" strokeWidth="14" strokeLinecap="round" fill="none" />
      {/* Hand & Fingers */}
      <rect x="74" y="130" width="36" height="58" rx="7" fill="#0f172a" stroke="#475569" strokeWidth="2.5" />
      {/* Phone Screen Glow with OTP Shield */}
      <rect x="78" y="134" width="28" height="50" rx="4" fill="url(#phone-glow)" />
      {/* Shield Icon on Phone Screen */}
      <path d="M92 144 L99 147 L99 156 Q99 162 92 165 Q85 162 85 156 L85 147 Z" fill="#ffffff" />
      <circle cx="92" cy="154" r="2.5" fill="#2563eb" />
      {/* Golden Bangles */}
      <circle cx="78" cy="168" r="6" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
      <circle cx="76" cy="165" r="6" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
    </svg>
  )
}

// 2. Chapter 2: Impersonator & Fake Police Digital Arrest Confrontation
export function Chapter2Artwork({ className = '', size = 180 }: ArtworkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`overflow-hidden rounded-2xl ${className}`}
      aria-label="Illustration: Alert citizen rejecting fake police video call"
    >
      <defs>
        <radialGradient id="ch2-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="60%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <linearGradient id="ch2-scam-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#991b1b" />
        </linearGradient>
      </defs>

      {/* Dramatic Cinematic Painted Background */}
      <rect width="200" height="200" fill="url(#ch2-bg)" />

      {/* Glowing Smartphone Screen showing Fake Police Officer */}
      <rect x="35" y="25" width="130" height="150" rx="16" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
      <rect x="42" y="32" width="116" height="136" rx="10" fill="#1e293b" />

      {/* Red Warning Emergency Light Overlay on Screen */}
      <circle cx="100" cy="80" r="50" fill="url(#ch2-scam-glow)" opacity="0.25" />

      {/* Painted Fake Police Officer Figure on Video Call */}
      {/* Officer Cap with Golden Emblem */}
      <path d="M78 54 Q100 44 122 54 L126 62 L74 62 Z" fill="#090d16" />
      <path d="M74 62 Q100 58 126 62" stroke="#f59e0b" strokeWidth="3" fill="none" />
      <circle cx="100" cy="54" r="3.5" fill="#f59e0b" />
      {/* Head */}
      <ellipse cx="100" cy="74" rx="17" ry="20" fill="#d97706" />
      {/* Sunglass / Stern Gaze */}
      <rect x="88" y="69" width="10" height="7" rx="2" fill="#020617" />
      <rect x="102" y="69" width="10" height="7" rx="2" fill="#020617" />
      <line x1="98" y1="72" x2="102" y2="72" stroke="#020617" strokeWidth="2" />
      {/* Stern Mouth & Mustache */}
      <path d="M92 82 Q100 86 108 82" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Khaki Uniform with Fake Badges */}
      <path d="M68 96 L132 96 L140 148 L60 148 Z" fill="#78350f" />
      <rect x="74" y="104" width="14" height="4" fill="#dc2626" />
      <rect x="112" y="104" width="14" height="4" fill="#f59e0b" />
      {/* Big Stamp: FAKE CALL */}
      <rect x="52" y="116" width="96" height="22" rx="4" fill="#ef4444" opacity="0.9" />
      <text x="100" y="131" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="900" letterSpacing="1">
        DIGITAL ARREST = FAKE
      </text>

      {/* Citizen's Hand Declining / Hanging Up the Call */}
      <circle cx="100" cy="176" r="16" fill="#dc2626" stroke="#ffffff" strokeWidth="2" />
      {/* End Call Phone Icon */}
      <path d="M92 176 Q100 170 108 176" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// 3. Chapter 3: Smiling Indian Street Vendor with UPI QR Code Stand
export function Chapter3Artwork({ className = '', size = 180 }: ArtworkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`overflow-hidden rounded-2xl ${className}`}
      aria-label="Illustration: Indian merchant with UPI QR Code payment stand"
    >
      <defs>
        <radialGradient id="ch3-bg" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="50%" stopColor="#a7f3d0" />
          <stop offset="100%" stopColor="#059669" />
        </radialGradient>
        <linearGradient id="ch3-kurta" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0369a1" />
        </linearGradient>
        <linearGradient id="ch3-skin" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fed7aa" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>

      {/* Vibrant Painted Sunlight Background */}
      <rect width="200" height="200" fill="url(#ch3-bg)" />
      <circle cx="160" cy="45" r="40" fill="#fef08a" opacity="0.5" />

      {/* Colorful Tea/Shop Canopy in Background */}
      <path d="M0 20 L200 20 L180 50 L0 50 Z" fill="#f97316" />
      <path d="M0 20 L200 20 L180 35 L0 35 Z" fill="#facc15" />

      {/* Smiling Vendor Character */}
      {/* Head & Hair */}
      <circle cx="85" cy="80" r="30" fill="#0f172a" />
      <ellipse cx="85" cy="86" rx="22" ry="26" fill="url(#ch3-skin)" />
      {/* Friendly Eyes */}
      <circle cx="77" cy="82" r="2.8" fill="#0f172a" />
      <circle cx="93" cy="82" r="2.8" fill="#0f172a" />
      {/* Classic Indian Mustache & Big Smile */}
      <path d="M72 96 Q85 92 98 96 Q85 102 72 96 Z" fill="#0f172a" />
      <path d="M78 101 Q85 107 92 101" stroke="#be123c" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Tilak / Tika */}
      <line x1="85" y1="67" x2="85" y2="74" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />

      {/* Kurta & Gamcha / Scarf */}
      <path d="M50 130 Q85 120 120 130 L135 200 L35 200 Z" fill="url(#ch3-kurta)" />
      <path d="M60 128 Q75 160 80 200 L95 200 Q85 155 75 126 Z" fill="#ea580c" />

      {/* Real Stand: Soundbox & UPI QR Standee */}
      <rect x="120" y="90" width="62" height="88" rx="8" fill="#ffffff" stroke="#0f172a" strokeWidth="3" />
      {/* Header bar */}
      <rect x="120" y="90" width="62" height="22" rx="6" fill="#0284c7" />
      <text x="151" y="105" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="900">
        BHIM UPI
      </text>
      {/* QR Code Grid Graphic */}
      <rect x="130" y="120" width="12" height="12" fill="#0f172a" />
      <rect x="158" y="120" width="12" height="12" fill="#0f172a" />
      <rect x="130" y="148" width="12" height="12" fill="#0f172a" />
      <rect x="146" y="136" width="10" height="10" fill="#059669" />
      {/* Golden Rule Badge */}
      <rect x="112" y="166" width="78" height="20" rx="6" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
      <text x="151" y="180" textAnchor="middle" fill="#713f12" fontSize="9" fontWeight="900">
        NO PIN TO RECEIVE!
      </text>
    </svg>
  )
}

// 4. Chapter 4: Parcel Courier & Phishing Link Inspection
export function Chapter4Artwork({ className = '', size = 180 }: ArtworkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`overflow-hidden rounded-2xl ${className}`}
      aria-label="Illustration: Delivery courier and alert customer checking tracking link"
    >
      <defs>
        <radialGradient id="ch4-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#fff1f2" />
          <stop offset="60%" stopColor="#fecdd3" />
          <stop offset="100%" stopColor="#e11d48" />
        </radialGradient>
      </defs>

      {/* Painted Background */}
      <rect width="200" height="200" fill="url(#ch4-bg)" />

      {/* Parcel Package Box */}
      <path d="M70 120 L130 120 L150 150 L50 150 Z" fill="#d97706" stroke="#92400e" strokeWidth="2" />
      <path d="M50 150 L150 150 L140 195 L60 195 Z" fill="#b45309" stroke="#92400e" strokeWidth="2" />
      {/* Package Tape & Fragile Badge */}
      <line x1="100" y1="120" x2="100" y2="195" stroke="#fef08a" strokeWidth="6" />
      <rect x="80" y="155" width="40" height="16" rx="3" fill="#ef4444" />
      <text x="100" y="167" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
        HOLD / SEIZED?
      </text>

      {/* Courier Figure */}
      <circle cx="65" cy="70" r="22" fill="#0f172a" />
      {/* Delivery Cap */}
      <path d="M48 64 Q68 54 88 64 L96 70 L42 70 Z" fill="#dc2626" />
      <ellipse cx="66" cy="78" rx="16" ry="18" fill="#fba471" />
      <path d="M40 105 L90 105 L100 145 L30 145 Z" fill="#dc2626" />

      {/* Magnifying Glass checking suspicious phishing link on phone */}
      <circle cx="140" cy="80" r="28" fill="#ffffff" stroke="#2563eb" strokeWidth="5" opacity="0.95" />
      <line x1="160" y1="100" x2="182" y2="122" stroke="#1e293b" strokeWidth="9" strokeLinecap="round" />
      {/* Warning link inside lens */}
      <text x="140" y="78" textAnchor="middle" fill="#dc2626" fontSize="10" fontWeight="900">
        .apk / .top
      </text>
      <text x="140" y="90" textAnchor="middle" fill="#0f172a" fontSize="8" fontWeight="bold">
        FAKE LINK ⚠️
      </text>
    </svg>
  )
}

// 5. Chapter 5 & Quiz Champion Hero: Empowered Indian Family with Golden Shield
export function Chapter5Artwork({ className = '', size = 180 }: ArtworkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`overflow-hidden rounded-2xl ${className}`}
      aria-label="Illustration: Empowered Indian family with golden Suraksha safety shield"
    >
      <defs>
        <radialGradient id="ch5-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#f0fdfa" />
          <stop offset="55%" stopColor="#99f6e4" />
          <stop offset="100%" stopColor="#0d9488" />
        </radialGradient>
        <linearGradient id="gold-shield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* Painted Luminous Background */}
      <rect width="200" height="200" fill="url(#ch5-bg)" />

      {/* Sunburst Rays of Confidence */}
      <circle cx="100" cy="100" r="85" fill="#fef9c3" opacity="0.35" />

      {/* Elder Grandfather (Left) with white mustache & turban */}
      <circle cx="55" cy="82" r="22" fill="#e2e8f0" />
      <ellipse cx="55" cy="88" rx="15" ry="18" fill="#fba471" />
      <path d="M46 95 Q55 98 64 95" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M30 115 L80 115 L85 180 L25 180 Z" fill="#f8fafc" />

      {/* Mother & Daughter (Right) */}
      <circle cx="145" cy="82" r="22" fill="#1e1b4b" />
      <ellipse cx="145" cy="88" rx="15" ry="18" fill="#fed7aa" />
      <circle cx="143" cy="82" r="1.5" fill="#b91c1c" />
      <path d="M120 115 L170 115 L175 180 L115 180 Z" fill="#0d9488" />

      {/* Central Giant Golden Suraksha Shield with 1930 Helpline */}
      <path
        d="M100 48 L142 66 L142 118 Q142 152 100 172 Q58 152 58 118 L58 66 Z"
        fill="url(#gold-shield)"
        stroke="#ffffff"
        strokeWidth="3.5"
      />
      {/* Inner Shield Ring */}
      <path
        d="M100 56 L134 71 L134 114 Q134 142 100 160 Q66 142 66 114 L66 71 Z"
        fill="#1e1b4b"
      />

      {/* Golden Checkmark & 1930 Helpline */}
      <path
        d="M84 105 L96 117 L118 92"
        stroke="#facc15"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="76" y="128" width="48" height="18" rx="5" fill="#facc15" />
      <text x="100" y="141" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="900">
        DIAL 1930
      </text>
    </svg>
  )
}

// Map helper to return the matching chapter painted artwork
export function ChapterArtwork({ chapterNumber, size = 180, className = '' }: { chapterNumber: number; size?: number; className?: string }) {
  switch (chapterNumber) {
    case 1:
      return <Chapter1Artwork size={size} className={className} />
    case 2:
      return <Chapter2Artwork size={size} className={className} />
    case 3:
      return <Chapter3Artwork size={size} className={className} />
    case 4:
      return <Chapter4Artwork size={size} className={className} />
    case 5:
    default:
      return <Chapter5Artwork size={size} className={className} />
  }
}
