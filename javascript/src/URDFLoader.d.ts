import { LoadingManager, Object3D } from 'three';
import { URDFRobot } from './URDFClasses';

declare type MeshLoadFunc = function(url: string, manager: LoadingManager, onLoad: function(mesh: Object3D): void);
declare type URDFLoaderOptions = {

    packages?: string | { [key: string]: string },
    loadMeshCb?: MeshLoadFunc,
    workingPath?: string,
    fetchOptions?: object

};
export default class URDFLoader {

    manager: LoadingManager;
    defaultMeshLoader: MeshLoadFunc;
    constructor(manager?: Manager);
    load(url: string, function(robot: URDFRobot): void, options?: URDFLoaderOptions): void;
    parse(content: string, options?: URDFLoaderOptions): URDFRobot;

}
