import {
    WebGLRenderer,
    PerspectiveCamera,
    Scene,
    Mesh,
    PlaneBufferGeometry,
    ShadowMaterial,
    DirectionalLight,
    PCFSoftShadowMap,
    sRGBEncoding,
    Color,
    AmbientLight,
    Box3,
    LoadingManager,
    MathUtils,
    Group,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import URDFLoader from '../../src/URDFLoader.js';

let scene, camera, renderer, robot, controls, cameraContainer, vrCamera;

init();

function init() {

    scene = new Scene();
    scene.background = new Color(0xffab40);

    cameraContainer = new Group();
    scene.add(cameraContainer);

    vrCamera = new PerspectiveCamera();
    cameraContainer.add(vrCamera);

    camera = new PerspectiveCamera();
    camera.position.set(10, 10, 10);

    renderer = new WebGLRenderer({ antialias: true });
    renderer.outputEncoding = sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // vr
    renderer.xr.enabled = true;
    renderer.setAnimationLoop(render);
    document.body.appendChild(VRButton.createButton(renderer));

    const directionalLight = new DirectionalLight(0xffffff, 1.0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024);
    directionalLight.position.set(5, 30, 5);
    scene.add(directionalLight);

    const ambientLight = new AmbientLight(0xffb74d, 0.5);
    scene.add(ambientLight);

    const ground = new Mesh(new PlaneBufferGeometry(), new ShadowMaterial({ opacity: 0.25 }));
    ground.material.color.set(0xe65100).convertSRGBToLinear();
    ground.rotation.x = -Math.PI / 2;
    ground.scale.setScalar(30);
    ground.receiveShadow = true;
    scene.add(ground);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.minDistance = 1e-2;

    const manager = new LoadingManager();
    const loader = new URDFLoader(manager);
    loader.loadMeshCb = function(path, manager, onComplete) {
        const ext = path.split(/\./g).pop().toLowerCase();

        switch (ext) {

            case 'gltf':
                new GLTFLoader(manager).load(
                    path,
                    result => onComplete(result.scene),
                    null,
                    err => onComplete(null, err),
                );
                break;
            default:
                loader.defaultMeshLoader(path, manager, onComplete);

        }

    };
    loader.load('../../urdf/T12/urdf/T12_flipped.URDF', result => {
        robot = result;
    });

    manager.onLoad = function() {

        robot.rotation.x = Math.PI / 2;
        robot.traverse(c => {
            c.castShadow = true;
        });
        for (let i = 1; i <= 6; i++) {

            robot.joints[`HP${ i }`].setAngle(MathUtils.degToRad(30));
            robot.joints[`KP${ i }`].setAngle(MathUtils.degToRad(120));
            robot.joints[`AP${ i }`].setAngle(MathUtils.degToRad(-60));

        }
        robot.updateMatrixWorld(true);

        const bb = new Box3();
        bb.setFromObject(robot);

        robot.position.y -= bb.min.y;

        scene.add(robot);

    };

    onResize();
    window.addEventListener('resize', onResize);

}

function onResize() {

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    vrCamera.aspect = window.innerWidth / window.innerHeight;
    vrCamera.updateProjectionMatrix();

}

function render() {

    const vrEnabled = Boolean(renderer.xr.getSession());
    cameraContainer.position.copy(camera.position);
    renderer.render(scene, vrEnabled ? vrCamera : camera);

}
