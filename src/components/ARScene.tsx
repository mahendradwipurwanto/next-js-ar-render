import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const ARScene: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [arSupported, setArSupported] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);

    useEffect(() => {
        const checkARSupport = async () => {
            if (navigator.xr) {
                const supported = await navigator.xr.isSessionSupported("immersive-ar");
                setArSupported(supported);
            } else {
                setArSupported(false);
            }
        };

        checkARSupport();
    }, []);

    useEffect(() => {
        if (!sessionStarted || !mountRef.current || !arSupported) return;

        // Scene setup
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.01,
            20
        );
        scene.add(camera);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.xr.enabled = true; // Enable WebXR
        mountRef.current.appendChild(renderer.domElement);

        // Add light
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        scene.add(light);

        // Load GLTF Model
        const loader = new GLTFLoader();
        let model: THREE.Object3D | null = null;

        loader.load(
            "/example.glb",
            (gltf) => {
                model = gltf.scene;
                model.scale.set(0.2, 0.2, 0.2); // Adjust scale
                model.visible = false; // Initially invisible
                scene.add(model);
                console.log("Model loaded:", model); // Debugging output
            },
            undefined,
            (error) => {
                console.error("Error loading GLTF model:", error);
            }
        );

        // Start AR session
        const startAR = async () => {
            try {
                const session = await navigator.xr?.requestSession("immersive-ar", {
                    requiredFeatures: ["local", "hit-test"],
                });

                if (!session) {
                    console.error("AR session failed to start");
                    return;
                }

                renderer.xr.setSession(session);

                const referenceSpace = await session!.requestReferenceSpace("local");
                const viewerSpace = await session!.requestReferenceSpace("viewer");
                const hitTestSource = await session!.requestHitTestSource?.({
                    space: viewerSpace,
                });

                session!.addEventListener("select", () => {
                    // Show the model when the user selects a location
                    if (model) {
                        model.visible = true;
                    }
                });

                session!.addEventListener("end", () => {
                    // Cleanup when the session ends
                    hitTestSource?.cancel();
                });

                const onXRFrame = (time: number, frame: XRFrame) => {
                    const xrViewerPose = frame.getViewerPose(referenceSpace);
                    if (xrViewerPose && hitTestSource) {
                        const hitTestResults = frame.getHitTestResults(hitTestSource);
                        if (hitTestResults.length > 0) {
                            const hitPose = hitTestResults[0].getPose(referenceSpace);
                            if (hitPose && model) {
                                model.position.set(
                                    hitPose.transform.position.x,
                                    hitPose.transform.position.y,
                                    hitPose.transform.position.z
                                );
                                model.quaternion.set(
                                    hitPose.transform.orientation.x,
                                    hitPose.transform.orientation.y,
                                    hitPose.transform.orientation.z,
                                    hitPose.transform.orientation.w
                                );
                            }
                        }
                    }

                    renderer.render(scene, camera);
                    session!.requestAnimationFrame(onXRFrame);
                };

                session!.requestAnimationFrame(onXRFrame);
            } catch (error) {
                console.error("Failed to start AR session:", error);
            }
        };

        startAR();

        // Cleanup
        return () => {
            renderer.dispose();
            if (renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        };
    }, [sessionStarted, arSupported]);

    return (
        <div style={{ width: "100%", height: "100vh" }}>
            {!arSupported ? (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        textAlign: "center",
                    }}
                >
                    <p>AR is not supported on this device/browser.</p>
                </div>
            ) : !sessionStarted ? (
                <button
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        padding: "10px 20px",
                        fontSize: "16px",
                    }}
                    onClick={() => setSessionStarted(true)}
                >
                    Start AR
                </button>
            ) : null}
            <div ref={mountRef} />
        </div>
    );
};

export default ARScene;