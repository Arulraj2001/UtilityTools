import React from 'react'

export default function BackgroundLighting() {
  return (
    <div className="background-lighting" aria-hidden>
      <div className="hidden md:block bg-blob violet animate-floatBlob" style={{ top: '-12%', left: '-6%', opacity: 0.22, width: 640, height: 640, filter: 'blur(120px)' }} />
      <div className="hidden md:block bg-blob purple animate-float" style={{ top: '6%', right: '-10%', opacity: 0.18, width: 520, height: 520 }} />
      <div className="hidden md:block bg-blob center animate-pulse-glow" style={{ top: '28%', left: '18%', opacity: 0.12, width: 600, height: 600 }} />
      <div className="bg-blob white" style={{ bottom: '-12%', right: '10%', opacity: 0.12, width: 520, height: 520 }} />
      <div className="hidden md:block bg-blob violet animate-float" style={{ top: '60%', left: '60%', opacity: 0.06, width: 420, height: 420 }} />
      <div className="bg-blob purple" style={{ top: '70%', right: '20%', opacity: 0.05, width: 380, height: 380 }} />
    </div>
  )
}
