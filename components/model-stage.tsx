"use client";

import { OrbitControls, useAnimations, useGLTF } from "@react-three/drei";
import { Canvas, useLoader, useThree } from "@react-three/fiber";
import {
  Component,
  forwardRef,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";
import * as THREE from "three";
import { ENVIRONMENTS, type EnvironmentName } from "@/lib/lighting";

export type ModelStageHandle = {
  capture: () => Promise<Blob | null>;
};

type ModelStageProps = {
  src: string;
  env?: EnvironmentName;
  wireframe?: boolean;
  autoRotate?: boolean;
  interactive?: boolean;
  animate?: boolean;
  resetSignal?: number;
  enableCapture?: boolean;
  className?: string;
  onReady?: () => void;
};

function fitClone(scene: THREE.Object3D) {
  const cloned = cloneSkinned(scene);
  cloned.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((material) => material.clone());
    else if (mesh.material) mesh.material = mesh.material.clone();
  });
  cloned.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(cloned);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  cloned.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z, 0.0001);
  const wrapper = new THREE.Group();
  wrapper.add(cloned);
  wrapper.scale.setScalar(1.65 / maxDim);
  return wrapper;
}

function Lighting({
  name,
  onLit,
}: {
  name: EnvironmentName;
  onLit: () => void;
}) {
  const env = ENVIRONMENTS[name];
  const hdr = useLoader(RGBELoader, env.file);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const onLitRef = useRef(onLit);
  onLitRef.current = onLit;

  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const envMap = pmrem.fromEquirectangular(hdr).texture;
    scene.environment = envMap;
    scene.environmentIntensity = env.intensity;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = env.exposure;
    onLitRef.current();
    return () => {
      envMap.dispose();
      pmrem.dispose();
      if (scene.environment === envMap) scene.environment = null;
    };
  }, [env.exposure, env.intensity, gl, hdr, scene]);

  return (
    <>
      <color attach="background" args={[env.background]} />
      {name === "dark" ? (
        <directionalLight position={[4.2, 2.4, 3]} intensity={0.7} color="#c5d2ff" />
      ) : null}
    </>
  );
}

function FittedModel({
  src,
  wireframe,
  animate,
  onFitted,
}: {
  src: string;
  wireframe: boolean;
  animate: boolean;
  onFitted: () => void;
}) {
  const gltf = useGLTF(src);
  const root = useMemo(() => fitClone(gltf.scene), [gltf.scene]);
  const group = useRef<THREE.Group>(null);
  const { actions, names } = useAnimations(gltf.animations, group);
  const onFittedRef = useRef(onFitted);
  onFittedRef.current = onFitted;

  useLayoutEffect(() => {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        if (material && "wireframe" in material) {
          material.wireframe = wireframe;
          material.needsUpdate = true;
        }
      });
    });
  }, [root, wireframe]);

  useLayoutEffect(() => {
    onFittedRef.current();
  }, [root]);

  useEffect(() => {
    if (!animate) return;
    const name = names.find((entry) => /walk/i.test(entry)) ?? names[0];
    const action = name ? actions[name] : undefined;
    if (!action) return;
    action.reset().fadeIn(0.35).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, animate, names]);

  return (
    <group ref={group}>
      <primitive object={root} />
    </group>
  );
}

function CameraReset({ signal }: { signal: number }) {
  const controls = useThree((state) => state.controls) as { reset?: () => void } | null;
  const seen = useRef(signal);
  useEffect(() => {
    if (seen.current === signal) return;
    seen.current = signal;
    controls?.reset?.();
  }, [controls, signal]);
  return null;
}

function BindRenderer({ onGl }: { onGl: (gl: THREE.WebGLRenderer) => void }) {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    onGl(gl);
  }, [gl, onGl]);
  return null;
}

class StageErrorBoundary extends Component<
  { children: ReactNode; resetKey: string; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.failed) {
      this.setState({ failed: false });
    }
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export const ModelStage = forwardRef<ModelStageHandle, ModelStageProps>(function ModelStage(
  {
    src,
    env = "studio",
    wireframe = false,
    autoRotate = false,
    interactive = true,
    animate = false,
    resetSignal = 0,
    enableCapture = false,
    className,
    onReady,
  },
  ref,
) {
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [trackedSrc, setTrackedSrc] = useState(src);
  if (trackedSrc !== src) {
    setTrackedSrc(src);
    setReady(false);
    setFailed(false);
  }
  const flags = useRef({ model: false, env: false, sent: false, src });
  if (flags.current.src !== src) {
    flags.current = { model: false, env: false, sent: false, src };
  }
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const mark = useCallback((key: "model" | "env") => {
    flags.current[key] = true;
    if (flags.current.model && flags.current.env && !flags.current.sent) {
      flags.current.sent = true;
      setReady(true);
      onReadyRef.current?.();
    }
  }, []);

  const bind = useCallback((gl: THREE.WebGLRenderer) => {
    renderer.current = gl;
  }, []);

  useImperativeHandle(ref, () => ({
    capture() {
      const gl = renderer.current;
      if (!gl) return Promise.resolve(null);
      return new Promise((resolve) => {
        gl.domElement.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
      });
    },
  }));

  return (
    <div className={className ?? "relative h-full w-full"}>
      <StageErrorBoundary resetKey={src} onError={() => setFailed(true)}>
        <Canvas
          style={{ position: "absolute", inset: 0 }}
          dpr={interactive ? [1, 1.75] : 1}
          camera={{ position: [2.55, 1.15, 2.95], fov: 30, near: 0.05, far: 50 }}
          gl={{
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: enableCapture,
            powerPreference: "high-performance",
          }}
        >
          <Suspense fallback={null}>
            <BindRenderer onGl={bind} />
            <Lighting name={env} onLit={() => mark("env")} />
            <FittedModel
              src={src}
              wireframe={wireframe}
              animate={animate}
              onFitted={() => mark("model")}
            />
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.08}
              autoRotate={autoRotate}
              autoRotateSpeed={0.65}
              enablePan={interactive}
              enableRotate={interactive}
              enableZoom={interactive}
              minDistance={1.2}
              maxDistance={8}
            />
            <CameraReset signal={resetSignal} />
          </Suspense>
        </Canvas>
      </StageErrorBoundary>
      {!ready && !failed ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="size-4 animate-spin rounded-full border border-white/20 border-t-white" />
        </div>
      ) : null}
      {failed ? (
        <div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white/60">
          This file couldn’t be opened. A self-contained .glb is the surest bet.
        </div>
      ) : null}
    </div>
  );
});

export function preloadModel(src: string) {
  useGLTF.preload(src);
}
