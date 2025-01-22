import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

const ARScene: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [arSupported, setArSupported] = useState(false);
    const [sessionStarted, setSessionStarted] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [showPermissionPopup, setShowPermissionPopup] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    const requestPermissions = async () => {
        try {
            // Request camera permission (navigator.mediaDevices.getUserMedia is used to request camera)
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Stop the stream after checking

            // Request AR session permission
            if (navigator.xr && arSupported) {
                const session = await navigator.xr.requestSession("immersive-ar", {
                    requiredFeatures: ["local", "hit-test"],
                });
                session.end(); // End session immediately if permission granted
            }

            setPermissionGranted(true);
            setShowPermissionPopup(false); // Hide the permission popup if granted
        } catch (error) {
            setErrorMessage("Error requesting permissions: " + error);
        }
    };

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
                setErrorMessage("Error loading GLTF model: " + error.message);
            }
        );

        // Start AR session
        const startAR = async () => {
            try {
                if (!navigator.xr) {
                    throw new Error("WebXR API is not available.");
                }

                const session = await navigator.xr.requestSession("immersive-ar", {
                    requiredFeatures: ["local", "hit-test"],
                });

                if (!session) {
                    throw new Error("AR session failed to start");
                }

                renderer.xr.setSession(session);

                const referenceSpace = await session.requestReferenceSpace("local");
                const viewerSpace = await session.requestReferenceSpace("viewer");
                const hitTestSource = await session.requestHitTestSource?.({
                    space: viewerSpace,
                });

                session.addEventListener("select", () => {
                    // Show the model when the user selects a location
                    if (model) {
                        model.visible = true;
                    }
                });

                session.addEventListener("end", () => {
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
                    session.requestAnimationFrame(onXRFrame);
                };

                session.requestAnimationFrame(onXRFrame);
            } catch (error) {
                setErrorMessage("Failed to start AR session: " + error);
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
            ) : !permissionGranted ? (
                <button
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        padding: "10px 20px",
                        fontSize: "16px",
                    }}
                    onClick={requestPermissions}
                >
                    Grant Permissions
                </button>
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

            {/* Permission pop-up */}
            {showPermissionPopup && (
                <div
                    style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        padding: "20px",
                        background: "rgba(0, 0, 0, 0.8)",
                        borderRadius: "10px",
                        color: "white",
                        textAlign: "center",
                        zIndex: 1000,
                    }}
                >
                    <h2>Permissions Required</h2>
                    <p>
                        This application requires access to your camera and AR functionality to
                        provide the augmented reality experience.
                    </p>
                    <button
                        onClick={requestPermissions}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#00aaff",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            borderRadius: "5px",
                        }}
                    >
                        Grant Permissions
                    </button>
                </div>
            )}

            {/* Error Pop-up */}
            {errorMessage && (
                <div
                    style={{
                        position: "absolute",
                        top: "20%",
                        left: "50%",
                        transform: "translateX(-50%)",
                        padding: "20px",
                        background: "rgba(255, 0, 0, 0.8)",
                        borderRadius: "10px",
                        color: "white",
                        textAlign: "center",
                        zIndex: 1000,
                    }}
                >
                    <h2>Error</h2>
                    <p>{errorMessage}</p>
                    <button
                        onClick={() => setErrorMessage(null)} // Close the error pop-up
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#ff4444",
                            border: "none",
                            color: "white",
                            cursor: "pointer",
                            borderRadius: "5px",
                        }}
                    >
                        Close
                    </button>
                </div>
            )}

            {/* Placeholder square for camera feed */}
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "80%",
                    height: "80%",
                    backgroundColor: "rgba(255, 255, 255, 0.7)", // Semi-transparent white for visibility
                    border: "2px dashed #000", // Dotted border to represent camera area
                    textAlign: "center",
                    lineHeight: "80vh",
                    color: "#000",
                }}
            >
                Camera Feed
            </div>

            <div ref={mountRef} />
        </div>
    );
};

export default ARScene;