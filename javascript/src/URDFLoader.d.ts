import { LoadingManager, Object3D } from 'three';
import { URDFRobot } from './URDFClasses';

declare function MeshLoadDoneFunc(mesh: Object3D): void;
declare function MeshLoadFunc(url: string, manager: LoadingManager, onLoad: MeshLoadDoneFunc);
declare type URDFLoaderOptions = {

    packages?: string | { [key: string]: string },
    loadMeshCb?: MeshLoadFunc,
    workingPath?: string,
    fetchOptions?: object

};
export default class URDFLoader {

    manager: LoadingManager;
    defaultMeshLoader: MeshLoadFunc;
    constructor(manager?: LoadingManager);
    load(url: string, onLoad: function(robot: URDFRobot): void, options?: URDFLoaderOptions): void;
    parse(content: string, options?: URDFLoaderOptions): URDFRobot;

}
