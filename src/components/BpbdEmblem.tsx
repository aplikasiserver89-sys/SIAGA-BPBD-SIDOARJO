import React, { useState } from 'react';

interface BpbdEmblemProps {
  className?: string;
}

export const OFFICIAL_BPBD_LOGO_SRC =
  '/assets/aistudio/images__14__e7f780c6.jpeg';

export const BpbdEmblem: React.FC<BpbdEmblemProps> = ({
  className = 'w-10 h-10',
}) => {
  const [imgError, setImgError] = useState(false);

  if (imgError) {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        role="img"
        aria-label="Logo Resmi BPBD Kabupaten Sidoarjo"
      >
        <circle cx="60" cy="60" r="57" fill="#DC2626" stroke="#FFFFFF" strokeWidth="3" />
        <circle cx="60" cy="60" r="38" fill="#F97316" stroke="#FFFFFF" strokeWidth="2" />
        <path d="M60 28L85 72H35L60 28Z" fill="#1E1B4B" />
        <text
          x="60"
          y="87"
          textAnchor="middle"
          fill="#0F172A"
          fontSize="13"
          fontWeight="800"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          BPBD
        </text>
      </svg>
    );
  }

  return (
    <div
      className={`${className} rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center ring-1 ring-white/40`}
    >
      <img
        src={OFFICIAL_BPBD_LOGO_SRC}
        alt="Logo Resmi BPBD Kabupaten Sidoarjo"
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className="w-full h-full object-cover scale-[1.34] select-none"
      />
    </div>
  );
};
