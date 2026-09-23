import { Suspense } from 'react';
import { StudioStage } from './StudioStage';
import { LaFerrariHero } from './LaFerrariHero';

interface FerrariMasterSceneProps {
  scrollProgress: number;
}

export function FerrariMasterScene({ scrollProgress }: FerrariMasterSceneProps) {
  return (
    <>
      {/* Studio Lighting & Ground Environment */}
      <StudioStage scrollProgress={scrollProgress} />

      {/* The 26MB Photorealistic Ferrari LaFerrari 3D Vehicle */}
      <Suspense fallback={null}>
        <LaFerrariHero scrollProgress={scrollProgress} />
      </Suspense>
    </>
  );
}

export default FerrariMasterScene;
