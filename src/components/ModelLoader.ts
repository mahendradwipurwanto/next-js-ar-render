import { useEffect } from "react";
import { Scene } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";

interface ModelLoaderProps {
    scene: Scene;
    modelPath: string;
}

const ModelLoader: React.FC<ModelLoaderProps> = ({ scene, modelPath }) => {
    useEffect(() => {
        const loader = new GLTFLoader();
        loader.load(
            modelPath,
            (gltf) => {
                scene.add(gltf.scene);
            },
            undefined,
            (error) => {
                console.error("Error loading model:", error);
            }
        );
    }, [scene, modelPath]);

    return null;
};

export default ModelLoader;
