import { Suspense, useLayoutEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Center, OrbitControls } from "@react-three/drei";
import { useConfiguredGLTF } from "../utils/gltfCache";
import { ensureKtx2Support } from "../utils/gltfLoaderSetup";

function Model({ url }: { url: string }) {
  const { scene } = useConfiguredGLTF(url);
  return (
    <Center>
      <primitive object={scene.clone(true)} />
    </Center>
  );
}

function CameraSetup({ url }: { url: string }) {
  const { camera } = useThree();

  useLayoutEffect(() => {
    camera.position.set(2.2, 1.6, 2.2);
    camera.lookAt(0, 0, 0);
  }, [camera, url]);

  return null;
}

interface ModelCanvasProps {
  url: string;
}

export function ModelCanvas({ url }: ModelCanvasProps) {
  return (
    <Canvas
      key={url}
      camera={{ fov: 45, near: 0.01, far: 1000 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => ensureKtx2Support(gl)}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#111820"]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} />
      <directionalLight position={[-3, 2, -2]} intensity={0.35} />
      <CameraSetup url={url} />
      <Suspense fallback={null}>
        <Model url={url} />
      </Suspense>
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={0.5}
        maxDistance={20}
      />
    </Canvas>
  );
}
