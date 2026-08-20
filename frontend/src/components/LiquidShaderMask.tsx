"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

const VERTEX_SHADER = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
uniform float uProgress;
uniform float uTime;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  // Correct aspect ratio so circular distortion remains uniform across viewports
  vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
  vec2 uv = (vUv - 0.5) * aspect;
  float dist = length(uv);
  float angle = atan(uv.y, uv.x);

  // Layered multi-frequency liquid wave harmonics
  float wave1 = sin(angle * 3.0 + uTime * 2.5) * 0.06;
  float wave2 = sin(angle * 7.0 - uTime * 4.0) * 0.035;
  float wave3 = sin(angle * 11.0 + uTime * 5.0) * 0.02;
  float wave4 = sin(angle * 19.0 - uTime * 8.0) * 0.012;
  float organic = sin(angle * 5.0 + sin(uTime * 1.5) * 4.0) * 0.03;

  float totalDistortion = (wave1 + wave2 + wave3 + wave4 + organic) * smoothstep(0.0, 0.35, uProgress);
  float radius = uProgress + totalDistortion;

  // Reveal area: discard fragment to expose underlying new page
  if (dist < radius) {
    discard;
  }

  // Cover area: solid brutalist background (#0A0A0A)
  gl_FragColor = vec4(0.0392, 0.0392, 0.0392, 1.0);
}
`;

interface LiquidShaderMaskProps {
  onComplete: () => void;
}

export function LiquidShaderMask({ onComplete }: LiquidShaderMaskProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const uniformsRef = useRef<{
    uProgress: { value: number };
    uTime: { value: number };
    uResolution: { value: THREE.Vector2 };
  }>({
    uProgress: { value: 0.0 },
    uTime: { value: 0.0 },
    uResolution: { value: new THREE.Vector2(1920, 1080) },
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Scene & Orthographic Camera for Fullscreen Quad
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Update initial resolution
    uniformsRef.current.uResolution.value.set(width, height);
    uniformsRef.current.uProgress.value = 0.0;
    uniformsRef.current.uTime.value = 0.0;

    // Full-screen Quad Geometry (2x2 units in normalized coordinates)
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: uniformsRef.current,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    // Continuous GPU Time Loop (Zero React state updates)
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const render = () => {
      uniformsRef.current.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    // GSAP Animation Engine: Animate uProgress directly on GPU
    const tl = gsap.timeline({
      onComplete: () => {
        onComplete();
      },
    });

    // Hold cover briefly for route render, then fluidly expand hole
    tl.to(uniformsRef.current.uProgress, {
      value: 1.6,
      duration: 1.25,
      ease: "power3.inOut",
      delay: 0.12,
    });

    // Handle Resize
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      uniformsRef.current.uResolution.value.set(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      tl.kill();
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onComplete]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 z-[9999] pointer-events-none w-full h-full"
    />
  );
}
