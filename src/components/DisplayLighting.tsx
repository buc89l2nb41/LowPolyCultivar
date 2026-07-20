import { Environment } from "@react-three/drei";

/** 실내 스튜디오 환경 반사 + 약한 보조광 — 그림자 없이 선명한 PBR */
export function DisplayLighting() {
  return (
    <>
      <Environment preset="studio" environmentIntensity={1.45} />
      <ambientLight intensity={0.38} />
    </>
  );
}
