/**
 * Rendered before Zustand stores finish rehydrating.
 * Shows only a lightweight loader so we never paint partial UI
 * or block the main thread with heavy lazy imports.
 */

import React from 'react';
import { SpatialLoader } from '@/components/ui/spatial-loader';

const BootstrapShell: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#080C14]">
      <SpatialLoader size="lg" message="Starting up…" />
    </div>
  );
};

export default React.memo(BootstrapShell);