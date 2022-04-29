import { LoadingManager, Object3D } from 'three';
import { URDFRobot } from './URDFClasses';

interface MeshLoadDoneFunc {
    (mesh: Object3D, err?: Error): void;
}

interface MeshLoadFunc{
    (url: string, manager: LoadingManager, onLoad: MeshLoadDoneFunc): void;
}

export default class URDFLoader {

    manager: LoadingManager;
    defaultMeshLoader: MeshLoadFunc;

    // options
    fetchOptions: Object;
    workingPath: string;
    parseVisual: boolean;
    parseCollision: boolean;
    packages: string | { [key: string]: string } | ((targetPkg: string) => string);
    loadMeshCb: MeshLoadFunc;

    constructor(manager?: LoadingManager);
    load(
        url: string,
        onLoad: (robot: URDFRobot) => void,
        onProgress?: () => void,
        onError?: () => void
    ): void;
    parse(content: string | Element | Document): URDFRobot;

}

export * from './URDFClasses';
