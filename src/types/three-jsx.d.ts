/**
 * src/types/three-jsx.d.ts
 *
 * تعريفات JSX لعناصر @react-three/fiber
 * يحل جميع أخطاء JSX.IntrinsicElements نهائياً
 */

import type { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

export {};