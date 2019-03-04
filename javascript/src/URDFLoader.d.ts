import { LoadingManager, Object3D } from 'three';
import { URDFRobot } from './URDFClasses';

declare type URDFLoaderOptions = {

    packages?: string | { [key: string]: string },
    loadMeshCb?: function(
        url: string,
        manager: LoadingManager,
        onLoad: function(mesh: Object3D): void
    ),
    workingPath?: string,
    fetchOptions?: object

};
class URDFLoader {

    manager: LoadingManager;
    constructor(manager?: Manager);
    load(url: string, function(robot: URDFRobot): void, options?: URDFLoaderOptions): void;
    parse(content: string, options?: URDFLoaderOptions): URDFRobot;

}
