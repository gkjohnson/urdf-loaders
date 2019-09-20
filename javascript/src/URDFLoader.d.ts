import { LoadingManager, Object3D } from 'three';
import { URDFRobot } from './URDFClasses';

interface MeshLoadDoneFunc {
    (mesh: Object3D): void;
}

interface MeshLoadFunc{
    (url: string, manager: LoadingManager, onLoad: MeshLoadDoneFunc): void;
}

interface URDFLoaderOptions {

    packages?: string | { [key: string]: string },
    loadMeshCb?: MeshLoadFunc,
    workingPath?: string,
    fetchOptions?: object

}

export default class URDFLoader {

    manager: LoadingManager;
    defaultMeshLoader: MeshLoadFunc;

    constructor(manager?: LoadingManager);
    load(
        url: string,
        onLoad: (robot: URDFRobot, errors?: { [url: string]: string }) => void,
        onProgress: (url: string, itemsLoaded: number, itemsTotal: number) => void,
        onError: (url: string) => void,
        options?: URDFLoaderOptions
    ): void;
    parse(content: string, options?: URDFLoaderOptions): URDFRobot;

}
