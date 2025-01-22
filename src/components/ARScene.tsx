import {useEffect, useRef, useState} from "react";
import * as THREE from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader";

const ARScene: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [arSupported, setArSupported] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);

    useEffect(() => {
        // Check if AR is supported
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

        // Scene
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(
            70,
            window.innerWidth / window.innerHeight,
            0.01,
            10
        );
        camera.position.z = 1;

        // Renderer
        const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.xr.enabled = true; // Enable WebXR
        mountRef.current.appendChild(renderer.domElement);

        // Add light
        const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
        scene.add(light);

        // Load GLTF Model
        const loader = new GLTFLoader();
        loader.load(
            "/example.glb",
            (gltf) => {
                const model = gltf.scene;
                model.scale.set(0.1, 0.1, 0.1); // Scale the model
                scene.add(model);
            },
            undefined,
            (error) => {
                console.error("Error loading GLTF model:", error);
            }
        );

        // Animation loop
        const animate = () => {
            renderer.render(scene, camera);
        };
        renderer.setAnimationLoop(animate);

        // Start AR session
        const startAR = async () => {
            try {
                const session = await navigator.xr?.requestSession("immersive-ar", {
                    requiredFeatures: ["local"],
                });
                renderer.xr.setSession(session!);
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
        <div style={{width: "100%", height: "100vh"}}>
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
            <div ref={mountRef}/>
        </div>
    );
};

export default ARScene;
