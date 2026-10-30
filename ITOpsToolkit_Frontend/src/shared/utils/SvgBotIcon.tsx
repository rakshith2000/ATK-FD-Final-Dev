import React, { useState } from 'react';

interface SvgImageBotProps {
    size?: number | string;
    eyeColor?: string;
}

export const SvgBotIcon: React.FC<SvgImageBotProps> = ({
    size = 400,
    eyeColor = '#38BDF8', // Bright, vibrant cyan/blue that pops against dark visor
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Embedded hardware-accelerated fluid keyframes
    const styleBlock = `
    @keyframes bot-float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-15px); }
    }
    @keyframes shadow-scale {
      0%, 100% { transform: scale(1); opacity: 0.25; }
      50% { transform: scale(0.85); opacity: 0.12; }
    }
    @keyframes eye-blink {
      0%, 48%, 52%, 100% { transform: scaleY(1); }
      50% { transform: scaleY(0.05); }
    }

    .float-group {
      animation: bot-float 4s ease-in-out infinite;
      transform-origin: center;
    }
    .shadow-el {
      animation: shadow-scale 4s ease-in-out infinite;
      transform-origin: 200px 370px;
    }
    .bot-eye {
      animation: eye-blink 4.5s ease-in-out infinite;
      transform-origin: center;
    }
  `;

    return (
        <div
            style={{
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: size,
                height: size,
                cursor: 'pointer',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <style>{styleBlock}</style>
            <svg viewBox="0 0 400 400" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Ground Ambient Shadow */}
                <ellipse className="shadow-el" cx="200" cy="370" rx="50" ry="14" fill="#9CA3AF" />

                {/* Floating Core Group */}
                <g className="float-group">
                    {/* Left Ear */}
                    <path d="M95 145 C75 145, 70 185, 95 195 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="3" />

                    {/* Right Ear */}
                    <path d="M305 125 C325 125, 330 165, 305 175 Z" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="3" />

                    {/* Left Arm */}
                    <path
                        d="M136 195 C115 195, 115 295, 134 295 C146 295, 148 220, 146 195 Z"
                        fill="url(#bodyGradient)"
                        stroke="#9CA3AF"
                        strokeWidth="3"
                        opacity="0.95"
                        style={{
                            transform: isHovered ? 'rotate(-6deg)' : 'none',
                            transformOrigin: '136px 195px',
                            transition: 'transform 0.4s ease',
                        }}
                    />

                    {/* Main Body Capsule */}
                    <path d="M160 215 C140 250, 150 310, 200 310 C250 310, 260 250, 240 215 Z" fill="url(#bodyGradient)" stroke="#9CA3AF" strokeWidth="3" />

                    {/* Body Inner Neck/Rim Collar */}
                    <ellipse cx="200" cy="215" rx="42" ry="14" fill="#9CA3AF" />

                    {/* Head Capsule Structure */}
                    <path d="M110 160 C100 95, 300 95, 290 160 C285 210, 115 210, 110 160 Z" fill="url(#headGradient)" stroke="#9CA3AF" strokeWidth="3" />

                    {/* Dark Glass Visor Screen */}
                    <rect x="135" y="125" width="130" height="70" rx="32" fill="#0F172A" stroke="#334155" strokeWidth="2" />

                    {/* Visor Glare Shadow Crescent */}
                    <path d="M220 125 A 65 65 0 0 1 265 185 A 32 32 0 0 0 265 125 Z" fill="#1E293B" opacity="0.6" />

                    {/* Animated Eyes Group */}
                    <g className="bot-eye">
                        {/* Left Glowing Capsule Eye */}
                        <rect
                            x="158"
                            y="145"
                            width="13"
                            height="30"
                            rx="6.5"
                            fill={eyeColor}
                            style={{
                                filter: isHovered ? 'drop-shadow(0 0 10px #38BDF8)' : 'drop-shadow(0 0 4px #38BDF8)',
                                transition: 'filter 0.3s',
                            }}
                        />
                        {/* Right Glowing Capsule Eye */}
                        <rect
                            x="229"
                            y="141"
                            width="13"
                            height="30"
                            rx="6.5"
                            fill={eyeColor}
                            style={{
                                filter: isHovered ? 'drop-shadow(0 0 10px #38BDF8)' : 'drop-shadow(0 0 4px #38BDF8)',
                                transition: 'filter 0.3s',
                            }}
                        />
                    </g>

                    {/* Right Arm */}
                    <path
                        d="M264 195 C285 195, 285 295, 266 295 C254 295, 252 220, 254 195 Z"
                        fill="url(#bodyGradient)"
                        stroke="#9CA3AF"
                        strokeWidth="3"
                        opacity="0.95"
                        style={{
                            transform: isHovered ? 'rotate(6deg)' : 'none',
                            transformOrigin: '264px 195px',
                            transition: 'transform 0.4s ease',
                        }}
                    />
                </g>

                {/* High contrast gradients for body definition */}
                <defs>
                    <linearGradient id="headGradient" x1="200" y1="90" x2="200" y2="200" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="70%" stopColor="#E2E8F0" />
                        <stop offset="100%" stopColor="#CBD5E1" />
                    </linearGradient>
                    <linearGradient id="bodyGradient" x1="200" y1="195" x2="200" y2="310" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#FFFFFF" />
                        <stop offset="70%" stopColor="#E2E8F0" />
                        <stop offset="100%" stopColor="#CBD5E1" />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
};
