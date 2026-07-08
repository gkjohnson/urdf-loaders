import { LoadingManager, Material, Object3D } from 'three';
import { URDFRobot } from './URDFClasses';

interface OnMeshLoadComplete {
    (mesh: Object3D, err?: Error): void;
}

interface MeshLoadFunc{
    (url: string, manager: LoadingManager, material: Material, onLoad: OnMeshLoadComplete): void;
}

export default class URDFLoader {

    manager: LoadingManager;
    defaultMeshLoader: MeshLoadFunc;

    // options
    fetchOptions: RequestInit;
    workingPath: string;
    parseVisual: boolean;
    parseCollision: boolean;
    packages: string | { [key: string]: string } | ((targetPkg: string) => string);
    loadMeshCb: MeshLoadFunc;

    constructor(manager?: LoadingManager);
    loadAsync(urdf: string): Promise<URDFRobot>;
    load(
        url: string,
        onLoad: (robot: URDFRobot) => void,
        onProgress?: (progress?: any) => void,
        onError?: (err?: any) => void
    ): void;
    parse(content: string | Element | Document): URDFRobot;

}

export * from './URDFClasses';
