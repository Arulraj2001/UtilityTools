import React, { useState, useRef, useEffect, useCallback } from 'react';

export default function BeforeAfter({ before, after, beforeLabel = 'Before', afterLabel = 'After' }) {
  const [pos, setPos] = useState(50);
  const [width, setWidth] = useState(0);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  // Measure container width on mount and resize to keep image alignment pixel-perfect
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    
    return () => {
      window.removeEventListener('resize', updateWidth);
    };
  }, []);

  const move = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  const onMouseMove = (e) => { if (dragging.current) move(e.clientX); };
  const onTouchMove = (e) => { if (dragging.current && e.touches[0]) move(e.touches[0].clientX); };

  const handleStart = (e) => {
    if (e.cancelable) e.preventDefault();
    dragging.current = true;
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden border border-border/50 bg-muted/20 select-none cursor-col-resize aspect-video w-full"
      onMouseMove={onMouseMove}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchMove={onTouchMove}
      onTouchEnd={() => { dragging.current = false; }}
    >
      {/* After (full) */}
      <img src={after} alt={afterLabel} className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none" />

      {/* Before (clipped) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" style={{ width: `${pos}%` }}>
        <img 
          src={before} 
          alt={beforeLabel} 
          className="absolute inset-0 h-full object-contain pointer-events-none max-w-none select-none" 
          style={{ width: width || '100%' }} 
        />
      </div>

      {/* Divider */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
        style={{ left: `${pos}%` }}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center border border-border/50">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-muted-foreground/60 rounded-full" />
            <div className="w-0.5 h-4 bg-muted-foreground/60 rounded-full" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <span className="absolute top-2 left-2 text-[10px] font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none select-none">{beforeLabel}</span>
      <span className="absolute top-2 right-2 text-[10px] font-semibold bg-black/50 text-white px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none select-none">{afterLabel}</span>
    </div>
  );
}