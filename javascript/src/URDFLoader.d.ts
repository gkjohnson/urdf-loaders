import { LoadingManager, Object3D, Material, MaterialParameters } from 'three';
import { URDFRobot } from './URDFClasses';

interface MeshLoadDoneFunc {
    (mesh: Object3D, err?: Error): void;
}

interface MeshLoadFunc{
    (url: string, manager: LoadingManager, onLoad: MeshLoadDoneFunc): void;
}

interface MaterialLoadFunc {
    <T extends MaterialParameters>(parameters?: T): Material;
}

export default class URDFLoader {

    manager: LoadingManager;
    defaultMeshLoader: MeshLoadFunc;
    defaultMaterialLoader: MaterialLoadFunc;

    // options
    fetchOptions: Object;
    workingPath: string;
    parseVisual: boolean;
    parseCollision: boolean;
    packages: string | { [key: string]: string } | ((targetPkg: string) => string);
    loadMeshCb: MeshLoadFunc;
    loadMaterialCb: MaterialLoadFunc;

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
