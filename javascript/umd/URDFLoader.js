(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('three'), require('three/examples/jsm/loaders/STLLoader.js'), require('three/examples/jsm/loaders/ColladaLoader.js')) :
    typeof define === 'function' && define.amd ? define(['three', 'three/examples/jsm/loaders/STLLoader.js', 'three/examples/jsm/loaders/ColladaLoader.js'], factory) :
    (global.URDFLoader = factory(global.THREE,global.THREE,global.THREE));
}(this, (function (THREE,STLLoader_js,ColladaLoader_js) { 'use strict';

    function URDFColliderClone(...args) {

        const proto = Object.getPrototypeOf(this);
        const result = proto.clone.call(this, ...args);
        result.isURDFCollider = true;
        return result;

    }

    function makeURDFCollider(object) {

        object.isURDFCollider = true;
        object.clone = URDFColliderClone;

    }

    class URDFLink extends THREE.Object3D {

        constructor(...args) {

            super(...args);
            this.isURDFLink = true;
            this.type = 'URDFLink';
            this.urdfNode = null;

        }

        copy(source, recursive) {

            super.copy(source, recursive);
            this.urdfNode = source.urdfNode;

            return this;

        }

    }

    class URDFJoint extends THREE.Object3D {

        get jointType() {

            return this._jointType;

        }
        set jointType(v) {

            if (this.jointType === v) return;
            this._jointType = v;

            switch (v) {

                case 'fixed':
                case 'continuous':
                case 'revolute':
                case 'prismatic':
                    this.jointValue = 0;
                    break;

                case 'planar':
                    this.jointValue = new Array(2).fill(0);
                    break;

                case 'floating':
                    this.jointValue = new Array(6).fill(0);
                    break;

            }

        }

        get angle() {

            return this.jointValue;

        }

        constructor(...args) {
            super(...args);

            this.isURDFJoint = true;
            this.type = 'URDFJoint';

            this.urdfNode = null;
            this.jointValue = null;
            this.jointType = 'fixed';
            this.axis = null;
            this.limit = { lower: 0, upper: 0 };
            this.ignoreLimits = false;

            this.origPosition = null;
            this.origQuaternion = null;
        }

        /* Overrides */
        copy(source, recursive) {

            super.copy(source, recursive);

            this.urdfNode = source.urdfNode;
            this.jointType = source.jointType;
            this.axis = source.axis ? source.axis.clone() : null;
            this.limit.lower = source.limit.lower;
            this.limit.upper = source.limit.upper;
            this.ignoreLimits = false;

            this.jointValue = Array.isArray(source.jointValue) ? [...source.jointValue] : source.jointValue;

            this.origPosition = source.origPosition ? source.origPosition.clone() : null;
            this.origQuaternion = source.origQuaternion ? source.origQuaternion.clone() : null;

            return this;
        }

        /* Public Functions */
        setAngle(...values) {
            return this.setOffset(...values);
        }

        setOffset(...values) {

            values = values.map(v => parseFloat(v));

            if (!this.origPosition || !this.origQuaternion) {

                this.origPosition = this.position.clone();
                this.origQuaternion = this.quaternion.clone();

            }

            switch (this.jointType) {

                case 'fixed': {
                    break;
                }
                case 'continuous':
                case 'revolute': {

                    let angle = values[0];
                    if (angle == null) break;
                    if (angle === this.jointValue) break;

                    if (!this.ignoreLimits && this.jointType === 'revolute') {

                        angle = Math.min(this.limit.upper, angle);
                        angle = Math.max(this.limit.lower, angle);

                    }

                    // FromAxisAngle seems to rotate the opposite of the
                    // expected angle for URDF, so negate it here
                    const delta = new THREE.Quaternion().setFromAxisAngle(this.axis, angle);
                    this.quaternion.multiplyQuaternions(this.origQuaternion, delta);

                    this.jointValue = angle;
                    this.matrixWorldNeedsUpdate = true;

                    break;
                }

                case 'prismatic': {

                    let angle = values[0];
                    if (angle == null) break;
                    if (angle === this.jointValue) break;

                    if (!this.ignoreLimits) {

                        angle = Math.min(this.limit.upper, angle);
                        angle = Math.max(this.limit.lower, angle);

                    }

                    this.position.copy(this.origPosition);
                    this.position.addScaledVector(this.axis, angle);

                    this.jointValue = angle;
                    this.worldMatrixNeedsUpdate = true;
                    break;

                }

                case 'floating':
                case 'planar':
                    // TODO: Support these joint types
                    console.warn(`'${ this.jointType }' joint not yet supported`);

            }

            return this.jointValue;

        }

    }

    class URDFRobot extends URDFLink {

        constructor(...args) {

            super(...args);
            this.isURDFRobot = true;
            this.urdfNode = null;

            this.urdfRobotNode = null;
            this.robotName = null;

            this.links = null;
            this.joints = null;

        }

        copy(source, recursive) {

            super.copy(source, recursive);

            this.urdfRobotNode = source.urdfRobotNode;
            this.robotName = source.robotName;

            this.links = {};
            this.joints = {};

            this.traverse(c => {

                if (c.isURDFJoint && c.name in source.joints) {

                    this.joints[c.name] = c;

                }

                if (c.isURDFLink && c.name in source.links) {

                    this.links[c.name] = c;

                }

            });

            return this;

        }

        setAngle(jointName, ...angle) {

            const joint = this.joints[jointName];
            if (joint) {

                return joint.setAngle(...angle);

            }

            return null;
        }

        setAngles(angles) {

            // TODO: How to handle other, multi-dimensional joint types?
            for (const name in angles) this.setAngle(name, angles[name]);

        }

    }

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
    class URDFLoader {

        constructor(manager) {

            this.manager = manager || THREE.DefaultLoadingManager;
            this.loadMeshCb = this.defaultMeshLoader.bind(this);
            this.parseVisual = true;
            this.parseCollision = false;
            this.packages = '';
            this.workingPath = '';
            this.fetchOptions = null;

        }

        /* Public API */
        // urdf:    The path to the URDF within the package OR absolute
        // onComplete:      Callback that is passed the model once loaded
        load(urdf, onComplete, onProgress, onError) {

            // Check if a full URI is specified before
            // prepending the package info
            const manager = this.manager;
            const workingPath = THREE.LoaderUtils.extractUrlBase(urdf);
            const urdfPath = this.manager.resolveURL(urdf);

            manager.itemStart(urdfPath);
            fetch(urdfPath, this.fetchOptions)
                .then(res => {
                    if (onProgress) {
                        onProgress(null);
                    }
                    return res.text();
                })
                .then(data => {

                    if (this.workingPath === '') {

                        this.workingPath = workingPath;

                    }

                    const model = this.parse(data);
                    onComplete(model);
                    manager.itemEnd(urdfPath);

                })
                .catch(e => {

                    if (onError) {
                        onError(e);
                    } else {
                        console.error('URDFLoader: Error loading file.', e);
                    }
                    manager.itemError(urdfPath);
                    manager.itemEnd(urdfPath);

                });

        }

        parse(content) {

            const packages = this.packages;
            const loadMeshCb = this.loadMeshCb;
            const parseVisual = this.parseVisual;
            const parseCollision = this.parseCollision;
            const workingPath = this.workingPath;
            const manager = this.manager;
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

                        console.error(`URDFLoader : ${ targetPkg } not found in provided package list.`);
                        return null;

                    }

                }

            }

            // Process the URDF text format
            function processUrdf(data) {

                let children;
                if (data instanceof Document) {

                    children = [ ...data.children ];

                } else if (data instanceof Element) {

                    children = [ data ];

                } else {

                    const parser = new DOMParser();
                    const urdf = parser.parseFromString(data, 'text/xml');
                    children = [ ...urdf.children ];

                }

                const robotNode = children.filter(c => c.nodeName === 'robot').pop();
                return processRobot(robotNode);

            }

            // Process the <robot> node
            function processRobot(robot) {

                const robotNodes = [ ...robot.children ];
                const links = robotNodes.filter(c => c.nodeName.toLowerCase() === 'link');
                const joints = robotNodes.filter(c => c.nodeName.toLowerCase() === 'joint');
                const materials = robotNodes.filter(c => c.nodeName.toLowerCase() === 'material');
                const obj = new URDFRobot();

                obj.robotName = robot.getAttribute('name');
                obj.urdfRobotNode = robot;

                // Create the <material> map
                materials.forEach(m => {

                    const name = m.getAttribute('name');
                    materialMap[name] = processMaterial(m);

                });

                // Create the <link> map
                links.forEach(l => {

                    const name = l.getAttribute('name');
                    const isRoot = robot.querySelector(`child[link="${ name }"]`) === null;
                    linkMap[name] = processLink(l, isRoot ? obj : null);

                });

                // Create the <joint> map
                joints.forEach(j => {

                    const name = j.getAttribute('name');
                    jointMap[name] = processJoint(j);

                });

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
            function processLink(link, target = null) {

                if (target === null) {

                    target = new URDFLink();

                }

                const children = [ ...link.children ];
                target.name = link.getAttribute('name');
                target.urdfNode = link;

                if (parseVisual) {
                    const visualNodes = children.filter(n => n.nodeName.toLowerCase() === 'visual');
                    visualNodes.forEach(vn => processLinkElement(vn, target, materialMap));
                }
                if (parseCollision) {
                    const collisionNodes = children.filter(n => n.nodeName.toLowerCase() === 'collision');
                    collisionNodes.forEach(vn => processLinkElement(vn, target));
                }

                return target;

            }

            function processMaterial(node) {

                const matNodes = [ ...node.children ];
                const material = new THREE.MeshPhongMaterial();

                material.name = node.getAttribute('name') || '';
                matNodes.forEach(n => {

                    const type = n.nodeName.toLowerCase();
                    if (type === 'color') {

                        const rgba =
                            n
                                .getAttribute('rgba')
                                .split(/\s/g)
                                .map(v => parseFloat(v));

                        material.color.setRGB(rgba[0], rgba[1], rgba[2]);
                        material.opacity = rgba[3];
                        material.transparent = rgba[3] < 1;

                    } else if (type === 'texture') {

                        // The URDF spec does not require that the <texture/> tag include
                        // a filename attribute so skip loading the texture if not provided.
                        const filename = n.getAttribute('filename');
                        if (filename) {

                            const loader = new THREE.TextureLoader(manager);
                            const filePath = resolvePath(filename);
                            material.map = loader.load(filePath);

                        }

                    }
                });

                return material;

            }

            // Process the visual and collision nodes into meshes
            function processLinkElement(vn, linkObj, materialMap = {}) {

                const isCollisionNode = vn.nodeName.toLowerCase() === 'collision';
                let xyz = [0, 0, 0];
                let rpy = [0, 0, 0];
                let scale = [1, 1, 1];

                const children = [ ...vn.children ];
                let material = null;
                let primitiveModel = null;

                // get the material first
                const materialNode = children.filter(n => n.nodeName.toLowerCase() === 'material')[0];
                if (materialNode) {

                    const name = materialNode.getAttribute('name');
                    if (name && name in materialMap) {

                        material = materialMap[name];

                    } else {

                        material = processMaterial(materialNode);

                    }

                } else {

                    material = new THREE.MeshPhongMaterial();

                }

                children.forEach(n => {

                    const type = n.nodeName.toLowerCase();
                    if (type === 'geometry') {

                        const geoType = n.children[0].nodeName.toLowerCase();
                        if (geoType === 'mesh') {

                            const filename = n.children[0].getAttribute('filename');
                            const filePath = resolvePath(filename);

                            // file path is null if a package directory is not provided.
                            if (filePath !== null) {

                                const scaleAttr = n.children[0].getAttribute('scale');
                                if (scaleAttr) scale = processTuple(scaleAttr);

                                loadMeshCb(filePath, manager, (obj, err) => {

                                    if (err) {

                                        console.error('URDFLoader: Error loading mesh.', err);

                                    } else if (obj) {

                                        if (obj instanceof THREE.Mesh) {

                                            obj.material = material;

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

                                        if (isCollisionNode) {

                                            makeURDFCollider(obj);

                                        }

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

                            if (isCollisionNode) {

                                makeURDFCollider(primitiveModel);

                            }

                        } else if (geoType === 'sphere') {

                            primitiveModel = new THREE.Mesh();
                            primitiveModel.geometry = new THREE.SphereBufferGeometry(1, 30, 30);
                            primitiveModel.material = material;

                            const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                            primitiveModel.scale.set(radius, radius, radius);

                            linkObj.add(primitiveModel);

                            if (isCollisionNode) {

                                makeURDFCollider(primitiveModel);

                            }

                        } else if (geoType === 'cylinder') {

                            primitiveModel = new THREE.Mesh();
                            primitiveModel.geometry = new THREE.CylinderBufferGeometry(1, 1, 1, 30);
                            primitiveModel.material = material;

                            const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                            const length = parseFloat(n.children[0].getAttribute('length')) || 0;
                            primitiveModel.scale.set(radius, length, radius);
                            primitiveModel.rotation.set(Math.PI / 2, 0, 0);

                            linkObj.add(primitiveModel);

                            if (isCollisionNode) {

                                makeURDFCollider(primitiveModel);

                            }

                        }

                    } else if (type === 'origin') {

                        xyz = processTuple(n.getAttribute('xyz'));
                        rpy = processTuple(n.getAttribute('rpy'));

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

            return processUrdf(content);

        }

        // Default mesh loading function
        defaultMeshLoader(path, manager, done) {

            if (/\.stl$/i.test(path)) {

                const loader = new STLLoader_js.STLLoader(manager);
                loader.load(path, geom => {
                    const mesh = new THREE.Mesh(geom, new THREE.MeshPhongMaterial());
                    done(mesh);
                });

            } else if (/\.dae$/i.test(path)) {

                const loader = new ColladaLoader_js.ColladaLoader(manager);
                loader.load(path, dae => done(dae.scene));

            } else {

                console.warn(`URDFLoader: Could not load model at ${ path }.\nNo loader available`);

            }

        }

    }

    return URDFLoader;

})));
//# sourceMappingURL=URDFLoader.js.map
