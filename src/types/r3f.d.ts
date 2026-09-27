import '@react-three/fiber';

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements extends import('@react-three/fiber').ThreeElements {}
    }
  }
}