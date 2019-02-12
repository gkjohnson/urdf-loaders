import * as THREE from 'three';
import { STLLoader } from 'three/examples/js/loaders/STLLoader';
import { ColladaLoader } from 'three/examples/js/loaders/ColladaLoader';
import { URDFRobot, URDFJoint, URDFLink } from './URDFClasses.js';

/*
Reference coordinate frames for THREE.js and ROS.
Both coordinate systems are right handed so the URDF is instantiated without
frame transforms. The resulting model can be rotated to rectify the proper up,
right, and forward directions

THREE.js
   Y
   |
   |
   .-----X
 ／
Z

ROS URDf
       Z
       |   X
       | ／
 Y-----.

*/

const tempQuaternion = new THREE.Quaternion();
const tempEuler = new THREE.Euler();

// take a vector "x y z" and process it into
// an array [x, y, z]
function processTuple(val) {

    if (!val) return [0, 0, 0];
    return val.trim().split(/\s+/g).map(num => parseFloat(num));

}

// applies a rotation a threejs object in URDF order
function applyRotation(obj, rpy, additive = false) {

    // if additive is true the rotation is applied in
    // addition to the existing rotation
    if (!additive) obj.rotation.set(0, 0, 0);

    tempEuler.set(rpy[0], rpy[1], rpy[2], 'ZYX');
    tempQuaternion.setFromEuler(tempEuler);
    tempQuaternion.multiply(obj.quaternion);
    obj.quaternion.copy(tempQuaternion);

}

/* URDFLoader Class */
// Loads and reads a URDF file into a THREEjs Object3D format
export default
class URDFLoader {

    constructor(manager) {

        this.manager = manager || THREE.DefaultLoadingManager;

    }

    /* Public API */
    // urdf:    The path to the URDF within the package OR absolute
    // packages:     The equivelant of a (list of) ROS package(s):// directory
    // onComplete:      Callback that is passed the model once loaded
    load(urdf, packages, onComplete, options) {

        // Check if a full URI is specified before
        // prepending the package info
        const workingPath = THREE.LoaderUtils.extractUrlBase(urdf);
        const urdfPath = this.manager.resolveURL(urdf);

        options = Object.assign({ workingPath }, options);

        fetch(urdfPath, options.fetchOptions)
            .then(res => res.text())
            .then(data => this.parse(data, packages, onComplete, options));

    }

    parse(content, packages, onComplete, options) {

        options = Object.assign({

            loadMeshCb: this.defaultMeshLoader.bind(this),
            workingPath: '',

        }, options);

        const loadMeshCb = options.loadMeshCb;
        const workingPath = options.workingPath;
        const linkMap = {};
        const jointMap = {};
        const materialMap = {};

        // Resolves the path of mesh files
        function resolvePath(path) {

            if (!/^package:\/\//.test(path)) {

                return workingPath ? workingPath + path : path;

            }

            // Remove "package://" keyword and split meshPath at the first slash
            const [targetPkg, relPath] = path.replace(/^package:\/\//, '').split(/\/(.+)/);

            if (typeof packages === 'string') {

                // "pkg" is one single package
                if (packages.endsWith(targetPkg)) {

                    // "pkg" is the target package
                    return packages + '/' + relPath;

                } else {

                    // Assume "pkg" is the target package's parent directory
                    return packages + '/' + targetPkg + '/' + relPath;

                }

            } else if (typeof packages === 'object') {

                // "pkg" is a map of packages
                if (targetPkg in packages) {

                    return packages[targetPkg] + '/' + relPath;

                } else {

                    console.error(`URDFLoader : ${ targetPkg } not found in provided package list!`);
                    return null;

                }
            }
        }

        // Process the URDF text format
        function processUrdf(data) {

            const parser = new DOMParser();
            const urdf = parser.parseFromString(data, 'text/xml');
            const children = [ ...urdf.children ];

            const robotNode = children.filter(c => c.nodeName === 'robot').pop();
            return processRobot(robotNode);

        }

        // Process the <robot> node
        function processRobot(robot) {

            const materials = [ ...robot.querySelectorAll('material') ];
            const robotNodes = [ ...robot.children ];
            const links = robotNodes.filter(c => c.nodeName.toLowerCase() === 'link');
            const joints = robotNodes.filter(c => c.nodeName.toLowerCase() === 'joint');
            const obj = new URDFRobot();
            obj.name = robot.getAttribute('name');

            // Create the <material> map
            materials.forEach(m => {

                const name = m.getAttribute('name');
                if (!materialMap[name]) {

                    materialMap[name] = {};
                    const matNodes = [ ...m.children ];
                    matNodes.forEach(c => {

                        processMaterial(
                            materialMap[name],
                            c
                        );

                    });

                }

            });

            // Create the <link> map
            links.forEach(l => {

                const name = l.getAttribute('name');
                linkMap[name] = processLink(l);

            });

            // Create the <joint> map
            joints.forEach(j => {

                const name = j.getAttribute('name');
                jointMap[name] = processJoint(j);

            });

            for (const key in linkMap) {

                if (linkMap[key].parent == null) {

                    obj.add(linkMap[key]);

                }

            }

            obj.joints = jointMap;
            obj.links = linkMap;

            return obj;

        }

        // Process joint nodes and parent them
        function processJoint(joint) {

            const children = [ ...joint.children ];
            const jointType = joint.getAttribute('type');
            const obj = new URDFJoint();
            obj.urdfNode = joint;
            obj.name = joint.getAttribute('name');
            obj.jointType = jointType;

            let parent = null;
            let child = null;
            let xyz = [0, 0, 0];
            let rpy = [0, 0, 0];

            // Extract the attributes
            children.forEach(n => {

                const type = n.nodeName.toLowerCase();
                if (type === 'origin') {

                    xyz = processTuple(n.getAttribute('xyz'));
                    rpy = processTuple(n.getAttribute('rpy'));

                } else if (type === 'child') {

                    child = linkMap[n.getAttribute('link')];

                } else if (type === 'parent') {

                    parent = linkMap[n.getAttribute('link')];

                } else if (type === 'limit') {

                    obj.limit.lower = parseFloat(n.getAttribute('lower') || obj.limit.lower);
                    obj.limit.upper = parseFloat(n.getAttribute('upper') || obj.limit.upper);

                }

            });

            // Join the links
            parent.add(obj);
            obj.add(child);
            applyRotation(obj, rpy);
            obj.position.set(xyz[0], xyz[1], xyz[2]);

            // Set up the rotate function
            const axisNode = children.filter(n => n.nodeName.toLowerCase() === 'axis')[0];

            if (axisNode) {

                const axisXYZ = axisNode.getAttribute('xyz').split(/\s+/g).map(num => parseFloat(num));
                obj.axis = new THREE.Vector3(axisXYZ[0], axisXYZ[1], axisXYZ[2]);
                obj.axis.normalize();

            }

            return obj;

        }

        // Process the <link> nodes
        function processLink(link) {

            const children = [ ...link.children ];
            const visualNodes = children.filter(n => n.nodeName.toLowerCase() === 'visual');
            const obj = new URDFLink();
            obj.name = link.getAttribute('name');
            obj.urdfNode = link;

            visualNodes.forEach(vn => processVisualNode(vn, obj, materialMap));

            return obj;

        }

        function processMaterial(material, node) {

            const type = node.nodeName.toLowerCase();
            if (type === 'color') {

                const rgba =
                    node
                        .getAttribute('rgba')
                        .split(/\s/g)
                        .map(v => parseFloat(v));

                copyMaterialAttributes(
                    material,
                    {
                        color: new THREE.Color(rgba[0], rgba[1], rgba[2]),
                        opacity: rgba[3],
                        transparent: rgba[3] < 1,
                    });

            } else if (type === 'texture') {

                const loader = new THREE.TextureLoader(this.manager);
                const filename = node.getAttribute('filename');
                const filePath = resolvePath(filename);
                copyMaterialAttributes(
                    material,
                    {
                        map: loader.load(filePath),
                    });

            }
        }

        function copyMaterialAttributes(material, materialAttributes) {

            if ('color' in materialAttributes) {

                material.color = materialAttributes.color.clone();
                material.opacity = materialAttributes.opacity;
                material.transparent = materialAttributes.transparent;

            }

            if ('map' in materialAttributes) {

                material.map = materialAttributes.map.clone();

            }

        }

        // Process the visual nodes into meshes
        function processVisualNode(vn, linkObj, materialMap) {

            let xyz = [0, 0, 0];
            let rpy = [0, 0, 0];
            let scale = [1, 1, 1];

            const children = [ ...vn.children ];
            const material = new THREE.MeshPhongMaterial();
            let primitiveModel = null;
            children.forEach(n => {

                const type = n.nodeName.toLowerCase();
                if (type === 'geometry') {

                    const geoType = n.children[0].nodeName.toLowerCase();
                    if (geoType === 'mesh') {

                        const filename = n.children[0].getAttribute('filename');
                        const filePath = resolvePath(filename);

                        // file path is null if a package directory is not provided.
                        if (filePath !== null) {

                            const ext = filePath.match(/.*\.([A-Z0-9]+)$/i).pop() || '';
                            const scaleAttr = n.children[0].getAttribute('scale');
                            if (scaleAttr) scale = processTuple(scaleAttr);

                            loadMeshCb(filePath, ext, (obj, err) => {

                                if (err) {

                                    console.error('URDFLoader: Error loading mesh.', err);

                                } else if (obj) {

                                    if (obj instanceof THREE.Mesh) {

                                        obj.material.copy(material);

                                    }

                                    linkObj.add(obj);

                                    obj.position.set(xyz[0], xyz[1], xyz[2]);
                                    obj.rotation.set(0, 0, 0);

                                    // multiply the existing scale by the scale components because
                                    // the loaded model could have important scale values already applied
                                    // to the root. Collada files, for example, can load in with a scale
                                    // to convert the model units to meters.
                                    obj.scale.x *= scale[0];
                                    obj.scale.y *= scale[1];
                                    obj.scale.z *= scale[2];

                                    applyRotation(obj, rpy);

                                }

                            });

                        }

                    } else if (geoType === 'box') {

                        primitiveModel = new THREE.Mesh();
                        primitiveModel.geometry = new THREE.BoxBufferGeometry(1, 1, 1);
                        primitiveModel.material = material;

                        const size = processTuple(n.children[0].getAttribute('size'));

                        linkObj.add(primitiveModel);
                        primitiveModel.scale.set(size[0], size[1], size[2]);

                    } else if (geoType === 'sphere') {

                        primitiveModel = new THREE.Mesh();
                        primitiveModel.geometry = new THREE.SphereBufferGeometry(1, 30, 30);
                        primitiveModel.material = material;

                        const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                        primitiveModel.scale.set(radius, radius, radius);

                        linkObj.add(primitiveModel);

                    } else if (geoType === 'cylinder') {

                        primitiveModel = new THREE.Mesh();
                        primitiveModel.geometry = new THREE.CylinderBufferGeometry(1, 1, 1, 30);
                        primitiveModel.material = material;

                        const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                        const length = parseFloat(n.children[0].getAttribute('length')) || 0;
                        primitiveModel.scale.set(radius, length, radius);
                        primitiveModel.rotation.set(Math.PI / 2, 0, 0);

                        linkObj.add(primitiveModel);

                    }

                } else if (type === 'origin') {

                    xyz = processTuple(n.getAttribute('xyz'));
                    rpy = processTuple(n.getAttribute('rpy'));

                } else if (type === 'material') {

                    const materialName = n.getAttribute('name');
                    if (materialName) {

                        copyMaterialAttributes(material, materialMap[materialName]);

                    } else {

                        children.forEach(c => {

                            processMaterial(material, c);

                        });

                    }

                }
            });

            // apply the position and rotation to the primitive geometry after
            // the fact because it's guaranteed to have been scraped from the child
            // nodes by this point
            if (primitiveModel) {

                applyRotation(primitiveModel, rpy, true);
                primitiveModel.position.set(xyz[0], xyz[1], xyz[2]);

            }

        }

        const result = processUrdf(content);

        onComplete(result);

        return result;

    }

    // Default mesh loading function
    defaultMeshLoader(path, ext, done) {

        if (/\.stl$/i.test(path)) {

            const loader = new STLLoader(this.manager);
            loader.load(path, geom => {
                const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial());
                done(mesh);
            });

        } else if (/\.dae$/i.test(path)) {

            const loader = new ColladaLoader(this.manager);
            loader.load(path, dae => done(dae.scene));

        } else {

            console.warn(`URDFLoader: Could not load model at ${ path }.\nNo loader available`);

        }

    }

};
