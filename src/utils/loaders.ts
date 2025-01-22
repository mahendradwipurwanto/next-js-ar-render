declare module "three/examples/jsm/loaders/GLTFLoader" {
    import { LoadingManager, Group } from "three";
    export class GLTFLoader {
        constructor(manager?: LoadingManager);
        load(
            url: string,
            onLoad: (gltf: { scene: Group }) => void,
            onProgress?: (event: ProgressEvent) => void,
            onError?: (event: ErrorEvent) => void
        ): void;
    }
}