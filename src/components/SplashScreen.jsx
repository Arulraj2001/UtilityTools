import React, { useState, useEffect } from 'react'

export default function SplashScreen({ duration = 800 }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration])

  if (!isVisible) return null

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center z-50 overflow-hidden transition-opacity duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Background using website brand colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#f3f1ff] via-[#d9d2ff] via-[#8b5cf6] to-[#5b21b6] animate-gradient"></div>

      {/* Floating Gradient Blobs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#7c3aed] opacity-25 rounded-full blur-3xl animate-pulse"></div>

      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#a78bfa] opacity-30 rounded-full blur-3xl animate-pulse"></div>

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#c4b5fd] opacity-30 rounded-full blur-3xl animate-ping"></div>

      <div className="absolute bottom-20 left-20 w-72 h-72 bg-[#ede9fe] opacity-40 rounded-full blur-3xl animate-pulse"></div>

      {/* Logo Container */}
      <div className="relative flex items-center justify-center">
        {/* Outer Glow */}
        <div className="absolute w-72 h-72 bg-white/20 rounded-full blur-3xl animate-pulse"></div>

        {/* Rotating Border */}
        <div className="absolute w-60 h-60 rounded-full border-[6px] border-white/30 animate-spin"></div>

        {/* Inner Border */}
        <div className="absolute w-48 h-48 rounded-full border-[4px] border-white/20 animate-pulse"></div>

        {/* Logo */}
        <picture className="relative z-10">
          <source srcSet="/logo.avif" type="image/avif" />
          <source srcSet="/logo.webp" type="image/webp" />
          <img
            src="/logo.svg"
            alt="Utility Tools Logo"
            className="w-40 h-40 animate-bounce drop-shadow-[0_10px_30px_rgba(91,33,182,0.5)]"
          />
        </picture>
      </div>

      {/* Brand Text */}
      <div className="absolute bottom-20 text-center px-4">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          <span className="text-[#0f172a]">All-in-one</span>
          <br />
          <span className="bg-gradient-to-r from-[#7c3aed] via-[#8b5cf6] to-[#4f46e5] bg-clip-text text-transparent">
            utility platform
          </span>
        </h1>
      </div>

      {/* Animated Gradient */}
      <style>{`
        @keyframes gradientMove {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .animate-gradient {
          background-size: 400% 400%;
          animation: gradientMove 10s ease infinite;
        }
      `}</style>
    </div>
  )
}