'use client';

import { useRef, type PointerEvent } from 'react';
import { cn } from '@/lib/cn';

const BLOCK_COUNT = 5;
const BLOCK_SPACING_PX = 46;
const MAX_TILT_DEG = 14;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Transforms stay literal so Tailwind can see them.
const SIDE_FACES = [
  '-ml-[88px] -mt-[15px] h-[30px] w-[176px] [transform:translateZ(88px)]',
  '-ml-[88px] -mt-[15px] h-[30px] w-[176px] [transform:rotateY(180deg)_translateZ(88px)]',
  '-ml-[88px] -mt-[15px] h-[30px] w-[176px] [transform:rotateY(90deg)_translateZ(88px)]',
  '-ml-[88px] -mt-[15px] h-[30px] w-[176px] [transform:rotateY(-90deg)_translateZ(88px)]',
];
const CAP_FACES = [
  '-ml-[88px] -mt-[88px] h-[176px] w-[176px] [transform:rotateX(90deg)_translateZ(15px)]',
  '-ml-[88px] -mt-[88px] h-[176px] w-[176px] [transform:rotateX(-90deg)_translateZ(15px)]',
];
const FACE_BASE = 'absolute left-1/2 top-1/2 border [backface-visibility:hidden]';

interface BlockProps {
  index: number;
}

// Decorative: each block stands for a verified attendance, the lit one the newest.
function Block({ index }: BlockProps) {
  const lit = index === BLOCK_COUNT - 1;
  const offset = (index - (BLOCK_COUNT - 1) / 2) * -BLOCK_SPACING_PX;
  return (
    <div className="absolute left-0 top-0 [transform-style:preserve-3d]" style={{ transform: `translateY(${offset}px)` }}>
      <div
        className={cn(
          '[transform-style:preserve-3d] transition-transform duration-300 ease-out hover:[transform:translateY(-14px)]',
          lit && 'animate-block-drop',
        )}
      >
        {SIDE_FACES.map((face) => (
          <div
            key={face}
            className={cn(FACE_BASE, face, lit ? 'border-green-dim bg-green-dim' : 'border-line-strong bg-surface')}
          />
        ))}
        {CAP_FACES.map((face) => (
          <div
            key={face}
            className={cn(FACE_BASE, face, lit ? 'border-green bg-green' : 'border-line-strong bg-raised')}
          />
        ))}
      </div>
    </div>
  );
}

export default function AttendanceStack() {
  const tiltRef = useRef<HTMLDivElement>(null);

  function setTilt(x: number, y: number) {
    tiltRef.current?.style.setProperty('--tilt-x', `${x}deg`);
    tiltRef.current?.style.setProperty('--tilt-y', `${y}deg`);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    setTilt(y * -2 * MAX_TILT_DEG, x * 2 * MAX_TILT_DEG);
  }

  return (
    <div
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt(0, 0)}
      className="relative grid h-[340px] touch-pan-y place-items-center [perspective:1600px] md:h-[440px]"
    >
      <div
        ref={tiltRef}
        className="relative h-0 w-0 transition-transform duration-300 ease-out [transform-style:preserve-3d] [transform:rotateX(calc(-30deg_+_var(--tilt-x,0deg)))_rotateY(var(--tilt-y,0deg))]"
      >
        <div className="relative h-0 w-0 animate-stack-spin [transform-style:preserve-3d] [transform:rotateY(45deg)]">
          {Array.from({ length: BLOCK_COUNT }, (_, index) => (
            <Block key={index} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
