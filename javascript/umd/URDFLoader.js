(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('three'), require('three/examples/jsm/loaders/STLLoader.js'), require('three/examples/jsm/loaders/ColladaLoader.js')) :
    typeof define === 'function' && define.amd ? define(['three', 'three/examples/jsm/loaders/STLLoader.js', 'three/examples/jsm/loaders/ColladaLoader.js'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.URDFLoader = factory(global.THREE, global.THREE, global.THREE));
})(this, (function (THREE, STLLoader_js, ColladaLoader_js) { 'use strict';

    function _interopNamespace(e) {
        if (e && e.__esModule) return e;
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n["default"] = e;
        return Object.freeze(n);
    }

    var THREE__namespace = /*#__PURE__*/_interopNamespace(THREE);

    const _tempAxis = new THREE.Vector3();
    const _tempEuler = new THREE.Euler();
    const _tempTransform = new THREE.Matrix4();
    const _tempOrigTransform = new THREE.Matrix4();
    const _tempQuat = new THREE.Quaternion();
    const _tempScale = new THREE.Vector3(1.0, 1.0, 1.0);
    const _tempPosition = new THREE.Vector3();

    class URDFBase extends THREE.Object3D {

        constructor(...args) {

            super(...args);
            this.urdfNode = null;
            this.urdfName = '';

        }

        copy(source, recursive) {

            super.copy(source, recursive);

            this.urdfNode = source.urdfNode;
            this.urdfName = source.urdfName;

            return this;

        }

    }

    class URDFCollider extends URDFBase {

        constructor(...args) {

            super(...args);
            this.isURDFCollider = true;
            this.type = 'URDFCollider';

        }

    }

    class URDFVisual extends URDFBase {

        constructor(...args) {

            super(...args);
            this.isURDFVisual = true;
            this.type = 'URDFVisual';

        }

    }

    class URDFLink extends URDFBase {

        constructor(...args) {

            super(...args);
            this.isURDFLink = true;
            this.type = 'URDFLink';

        }

    }

    class URDFJoint extends URDFBase {

        get jointType() {

            return this._jointType;

        }

        set jointType(v) {

            if (this.jointType === v) return;
            this._jointType = v;
            this.matrixWorldNeedsUpdate = true;
            switch (v) {

                case 'fixed':
                    this.jointValue = [];
                    break;

                case 'continuous':
                case 'revolute':
                case 'prismatic':
                    this.jointValue = new Array(1).fill(0);
                    break;

                case 'planar':
                    // Planar joints are, 3dof: position XY and rotation Z.
                    this.jointValue = new Array(3).fill(0);
                    this.axis = new THREE.Vector3(0, 0, 1);
                    break;

                case 'floating':
                    this.jointValue = new Array(6).fill(0);
                    break;

            }

        }

        get angle() {

            return this.jointValue[0];

        }

        constructor(...args) {

            super(...args);

            this.isURDFJoint = true;
            this.type = 'URDFJoint';

            this.jointValue = null;
            this.jointType = 'fixed';
            this.axis = new THREE.Vector3(1, 0, 0);
            this.limit = { lower: 0, upper: 0 };
            this.ignoreLimits = false;

            this.origPosition = null;
            this.origQuaternion = null;

            this.mimicJoints = [];

        }

        /* Overrides */
        copy(source, recursive) {

            super.copy(source, recursive);

            this.jointType = source.jointType;
            this.axis = source.axis.clone();
            this.limit.lower = source.limit.lower;
            this.limit.upper = source.limit.upper;
            this.ignoreLimits = false;

            this.jointValue = [...source.jointValue];

            this.origPosition = source.origPosition ? source.origPosition.clone() : null;
            this.origQuaternion = source.origQuaternion ? source.origQuaternion.clone() : null;

            this.mimicJoints = [...source.mimicJoints];

            return this;

        }

        /* Public Functions */
        /**
         * @param {...number|null} values The joint value components to set, optionally null for no-op
         * @returns {boolean} Whether the invocation of this function resulted in an actual change to the joint value
         */
        setJointValue(...values) {

            // Parse all incoming values into numbers except null, which we treat as a no-op for that value component.
            values = values.map(v => v === null ? null : parseFloat(v));

            if (!this.origPosition || !this.origQuaternion) {

                this.origPosition = this.position.clone();
                this.origQuaternion = this.quaternion.clone();

            }

            let didUpdate = false;

            this.mimicJoints.forEach(joint => {

                didUpdate = joint.updateFromMimickedJoint(...values) || didUpdate;

            });

            switch (this.jointType) {

                case 'fixed': {

                    return didUpdate;

                }
                case 'continuous':
                case 'revolute': {

                    let angle = values[0];
                    if (angle == null) return didUpdate;
                    if (angle === this.jointValue[0]) return didUpdate;

                    if (!this.ignoreLimits && this.jointType === 'revolute') {

                        angle = Math.min(this.limit.upper, angle);
                        angle = Math.max(this.limit.lower, angle);

                    }

                    this.quaternion
                        .setFromAxisAngle(this.axis, angle)
                        .premultiply(this.origQuaternion);

                    if (this.jointValue[0] !== angle) {

                        this.jointValue[0] = angle;
                        this.matrixWorldNeedsUpdate = true;
                        return true;

                    } else {

                        return didUpdate;

                    }

                }

                case 'prismatic': {

                    let pos = values[0];
                    if (pos == null) return didUpdate;
                    if (pos === this.jointValue[0]) return didUpdate;

                    if (!this.ignoreLimits) {

                        pos = Math.min(this.limit.upper, pos);
                        pos = Math.max(this.limit.lower, pos);

                    }

                    this.position.copy(this.origPosition);
                    _tempAxis.copy(this.axis).applyEuler(this.rotation);
                    this.position.addScaledVector(_tempAxis, pos);

                    if (this.jointValue[0] !== pos) {

                        this.jointValue[0] = pos;
                        this.matrixWorldNeedsUpdate = true;
                        return true;

                    } else {

                        return didUpdate;

                    }

                }

                case 'floating': {

                    // no-op if all values are identical to existing value or are null
                    if (this.jointValue.every((value, index) => values[index] === value || values[index] === null)) return didUpdate;
                    // Floating joints have six degrees of freedom: X, Y, Z, R, P, Y.
                    this.jointValue[0] = values[0] !== null ? values[0] : this.jointValue[0];
                    this.jointValue[1] = values[1] !== null ? values[1] : this.jointValue[1];
                    this.jointValue[2] = values[2] !== null ? values[2] : this.jointValue[2];
                    this.jointValue[3] = values[3] !== null ? values[3] : this.jointValue[3];
                    this.jointValue[4] = values[4] !== null ? values[4] : this.jointValue[4];
                    this.jointValue[5] = values[5] !== null ? values[5] : this.jointValue[5];

                    // Compose transform of joint origin and transform due to joint values
                    _tempOrigTransform.compose(this.origPosition, this.origQuaternion, _tempScale);
                    _tempQuat.setFromEuler(
                        _tempEuler.set(
                            this.jointValue[3],
                            this.jointValue[4],
                            this.jointValue[5],
                            'XYZ',
                        ),
                    );
                    _tempPosition.set(this.jointValue[0], this.jointValue[1], this.jointValue[2]);
                    _tempTransform.compose(_tempPosition, _tempQuat, _tempScale);

                    // Calcualte new transform
                    _tempOrigTransform.premultiply(_tempTransform);
                    this.position.setFromMatrixPosition(_tempOrigTransform);
                    this.rotation.setFromRotationMatrix(_tempOrigTransform);

                    this.matrixWorldNeedsUpdate = true;
                    return true;
                }

                case 'planar': {

                    // no-op if all values are identical to existing value or are null
                    if (this.jointValue.every((value, index) => values[index] === value || values[index] === null)) return didUpdate;

                    this.jointValue[0] = values[0] !== null ? values[0] : this.jointValue[0];
                    this.jointValue[1] = values[1] !== null ? values[1] : this.jointValue[1];
                    this.jointValue[2] = values[2] !== null ? values[2] : this.jointValue[2];

                    // Compose transform of joint origin and transform due to joint values
                    _tempOrigTransform.compose(this.origPosition, this.origQuaternion, _tempScale);
                    _tempQuat.setFromAxisAngle(this.axis, this.jointValue[2]);
                    _tempPosition.set(this.jointValue[0], this.jointValue[1], 0.0);
                    _tempTransform.compose(_tempPosition, _tempQuat, _tempScale);

                    // Calculate new transform
                    _tempOrigTransform.premultiply(_tempTransform);
                    this.position.setFromMatrixPosition(_tempOrigTransform);
                    this.rotation.setFromRotationMatrix(_tempOrigTransform);

                    this.matrixWorldNeedsUpdate = true;
                    return true;
                }

            }

            return didUpdate;

        }

    }

    class URDFMimicJoint extends URDFJoint {

        constructor(...args) {

            super(...args);
            this.type = 'URDFMimicJoint';
            this.mimicJoint = null;
            this.offset = 0;
            this.multiplier = 1;

        }

        updateFromMimickedJoint(...values) {

            const modifiedValues = values.map(x => x * this.multiplier + this.offset);
            return super.setJointValue(...modifiedValues);

        }

        /* Overrides */
        copy(source, recursive) {

            super.copy(source, recursive);

            this.mimicJoint = source.mimicJoint;
            this.offset = source.offset;
            this.multiplier = source.multiplier;

            return this;

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
            this.colliders = null;
            this.visual = null;
            this.frames = null;

        }

        copy(source, recursive) {

            super.copy(source, recursive);

            this.urdfRobotNode = source.urdfRobotNode;
            this.robotName = source.robotName;

            this.links = {};
            this.joints = {};
            this.colliders = {};
            this.visual = {};

            this.traverse(c => {

                if (c.isURDFJoint && c.urdfName in source.joints) {

                    this.joints[c.urdfName] = c;

                }

                if (c.isURDFLink && c.urdfName in source.links) {

                    this.links[c.urdfName] = c;

                }

                if (c.isURDFCollider && c.urdfName in source.colliders) {

                    this.colliders[c.urdfName] = c;

                }

                if (c.isURDFVisual && c.urdfName in source.visual) {

                    this.visual[c.urdfName] = c;

                }

            });

            // Repair mimic joint references once we've re-accumulated all our joint data
            for (const joint in this.joints) {
                this.joints[joint].mimicJoints = this.joints[joint].mimicJoints.map((mimicJoint) => this.joints[mimicJoint.name]);
            }

            this.frames = {
                ...this.colliders,
                ...this.visual,
                ...this.links,
                ...this.joints,
            };

            return this;

        }

        getFrame(name) {

            return this.frames[name];

        }

        setJointValue(jointName, ...angle) {

            const joint = this.joints[jointName];
            if (joint) {

                return joint.setJointValue(...angle);

            }

            return false;
        }

        setJointValues(values) {

            let didChange = false;
            for (const name in values) {

                const value = values[name];
                if (Array.isArray(value)) {

                    didChange = this.setJointValue(name, ...value) || didChange;

                } else {

                    didChange = this.setJointValue(name, value) || didChange;

                }

            }

            return didChange;

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

    const tempQuaternion = new THREE__namespace.Quaternion();
    const tempEuler = new THREE__namespace.Euler();

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

            this.manager = manager || THREE__namespace.DefaultLoadingManager;
            this.loadMeshCb = this.defaultMeshLoader.bind(this);
            this.parseVisual = true;
            this.parseCollision = false;
            this.packages = '';
            this.workingPath = '';
            this.fetchOptions = {};

        }

        /* Public API */
        loadAsync(urdf) {

            return new Promise((resolve, reject) => {

                this.load(urdf, resolve, null, reject);

            });

        }

        // urdf:    The path to the URDF within the package OR absolute
        // onComplete:      Callback that is passed the model once loaded
        load(urdf, onComplete, onProgress, onError) {

            // Check if a full URI is specified before
            // prepending the package info
            const manager = this.manager;
            const workingPath = THREE__namespace.LoaderUtils.extractUrlBase(urdf);
            const urdfPath = this.manager.resolveURL(urdf);

            manager.itemStart(urdfPath);

            fetch(urdfPath, this.fetchOptions)
                .then(res => {

                    if (res.ok) {

                        if (onProgress) {

                            onProgress(null);

                        }
                        return res.text();

                    } else {

                        throw new Error(`URDFLoader: Failed to load url '${ urdfPath }' with error code ${ res.status } : ${ res.statusText }.`);

                    }

                })
                .then(data => {

                    const model = this.parse(data, this.workingPath || workingPath);
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

        parse(content, workingPath = this.workingPath) {

            const packages = this.packages;
            const loadMeshCb = this.loadMeshCb;
            const parseVisual = this.parseVisual;
            const parseCollision = this.parseCollision;
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

                } else if (packages instanceof Function) {

                    return packages(targetPkg) + '/' + relPath;

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
                const visualMap = {};
                const colliderMap = {};
                links.forEach(l => {

                    const name = l.getAttribute('name');
                    const isRoot = robot.querySelector(`child[link="${ name }"]`) === null;
                    linkMap[name] = processLink(l, visualMap, colliderMap, isRoot ? obj : null);

                });

                // Create the <joint> map
                joints.forEach(j => {

                    const name = j.getAttribute('name');
                    jointMap[name] = processJoint(j);

                });

                obj.joints = jointMap;
                obj.links = linkMap;
                obj.colliders = colliderMap;
                obj.visual = visualMap;

                // Link up mimic joints
                const jointList = Object.values(jointMap);
                jointList.forEach(j => {

                    if (j instanceof URDFMimicJoint) {

                        jointMap[j.mimicJoint].mimicJoints.push(j);

                    }

                });

                // Detect infinite loops of mimic joints
                jointList.forEach(j => {

                    const uniqueJoints = new Set();
                    const iterFunction = joint => {

                        if (uniqueJoints.has(joint)) {

                            throw new Error('URDFLoader: Detected an infinite loop of mimic joints.');

                        }

                        uniqueJoints.add(joint);
                        joint.mimicJoints.forEach(j => {

                            iterFunction(j);

                        });

                    };

                    iterFunction(j);
                });

                obj.frames = {
                    ...colliderMap,
                    ...visualMap,
                    ...linkMap,
                    ...jointMap,
                };

                return obj;

            }

            // Process joint nodes and parent them
            function processJoint(joint) {

                const children = [ ...joint.children ];
                const jointType = joint.getAttribute('type');

                let obj;

                const mimicTag = children.find(n => n.nodeName.toLowerCase() === 'mimic');
                if (mimicTag) {

                    obj = new URDFMimicJoint();
                    obj.mimicJoint = mimicTag.getAttribute('joint');
                    obj.multiplier = parseFloat(mimicTag.getAttribute('multiplier') || 1.0);
                    obj.offset = parseFloat(mimicTag.getAttribute('offset') || 0.0);

                } else {

                    obj = new URDFJoint();

                }

                obj.urdfNode = joint;
                obj.name = joint.getAttribute('name');
                obj.urdfName = obj.name;
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
                    obj.axis = new THREE__namespace.Vector3(axisXYZ[0], axisXYZ[1], axisXYZ[2]);
                    obj.axis.normalize();

                }

                return obj;

            }

            // Process the <link> nodes
            function processLink(link, visualMap, colliderMap, target = null) {

                if (target === null) {

                    target = new URDFLink();

                }

                const children = [ ...link.children ];
                target.name = link.getAttribute('name');
                target.urdfName = target.name;
                target.urdfNode = link;

                if (parseVisual) {

                    const visualNodes = children.filter(n => n.nodeName.toLowerCase() === 'visual');
                    visualNodes.forEach(vn => {

                        const v = processLinkElement(vn, materialMap);
                        target.add(v);

                        if (vn.hasAttribute('name')) {

                            const name = vn.getAttribute('name');
                            v.name = name;
                            v.urdfName = name;
                            visualMap[name] = v;

                        }

                    });

                }

                if (parseCollision) {

                    const collisionNodes = children.filter(n => n.nodeName.toLowerCase() === 'collision');
                    collisionNodes.forEach(cn => {

                        const c = processLinkElement(cn);
                        target.add(c);

                        if (cn.hasAttribute('name')) {

                            const name = cn.getAttribute('name');
                            c.name = name;
                            c.urdfName = name;
                            colliderMap[name] = c;

                        }

                    });

                }

                return target;

            }

            function processMaterial(node) {

                const matNodes = [ ...node.children ];
                const material = new THREE__namespace.MeshPhongMaterial();

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
                        material.depthWrite = !material.transparent;

                    } else if (type === 'texture') {

                        // The URDF spec does not require that the <texture/> tag include
                        // a filename attribute so skip loading the texture if not provided.
                        const filename = n.getAttribute('filename');
                        if (filename) {

                            const loader = new THREE__namespace.TextureLoader(manager);
                            const filePath = resolvePath(filename);
                            material.map = loader.load(filePath);
                            material.map.colorSpace = THREE__namespace.SRGBColorSpace;

                        }

                    }
                });

                return material;

            }

            // Process the visual and collision nodes into meshes
            function processLinkElement(vn, materialMap = {}) {

                const isCollisionNode = vn.nodeName.toLowerCase() === 'collision';
                const children = [ ...vn.children ];
                let material = null;

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

                    material = new THREE__namespace.MeshPhongMaterial();

                }

                const group = isCollisionNode ? new URDFCollider() : new URDFVisual();
                group.urdfNode = vn;

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
                                if (scaleAttr) {

                                    const scale = processTuple(scaleAttr);
                                    group.scale.set(scale[0], scale[1], scale[2]);

                                }

                                loadMeshCb(filePath, manager, (obj, err) => {

                                    if (err) {

                                        console.error('URDFLoader: Error loading mesh.', err);

                                    } else if (obj) {

                                        if (obj instanceof THREE__namespace.Mesh) {

                                            obj.material = material;

                                        }

                                        // We don't expect non identity rotations or positions. In the case of
                                        // COLLADA files the model might come in with a custom scale for unit
                                        // conversion.
                                        obj.position.set(0, 0, 0);
                                        obj.quaternion.identity();
                                        group.add(obj);

                                    }

                                });

                            }

                        } else if (geoType === 'box') {

                            const primitiveModel = new THREE__namespace.Mesh();
                            primitiveModel.geometry = new THREE__namespace.BoxGeometry(1, 1, 1);
                            primitiveModel.material = material;

                            const size = processTuple(n.children[0].getAttribute('size'));
                            primitiveModel.scale.set(size[0], size[1], size[2]);

                            group.add(primitiveModel);

                        } else if (geoType === 'sphere') {

                            const primitiveModel = new THREE__namespace.Mesh();
                            primitiveModel.geometry = new THREE__namespace.SphereGeometry(1, 30, 30);
                            primitiveModel.material = material;

                            const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                            primitiveModel.scale.set(radius, radius, radius);

                            group.add(primitiveModel);

                        } else if (geoType === 'cylinder') {

                            const primitiveModel = new THREE__namespace.Mesh();
                            primitiveModel.geometry = new THREE__namespace.CylinderGeometry(1, 1, 1, 30);
                            primitiveModel.material = material;

                            const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                            const length = parseFloat(n.children[0].getAttribute('length')) || 0;
                            primitiveModel.scale.set(radius, length, radius);
                            primitiveModel.rotation.set(Math.PI / 2, 0, 0);

                            group.add(primitiveModel);

                        }

                    } else if (type === 'origin') {

                        const xyz = processTuple(n.getAttribute('xyz'));
                        const rpy = processTuple(n.getAttribute('rpy'));

                        group.position.set(xyz[0], xyz[1], xyz[2]);
                        group.rotation.set(0, 0, 0);
                        applyRotation(group, rpy);

                    }

                });

                return group;

            }

            return processUrdf(content);

        }

        // Default mesh loading function
        defaultMeshLoader(path, manager, done) {

            if (/\.stl$/i.test(path)) {

                const loader = new STLLoader_js.STLLoader(manager);
                loader.load(path, geom => {
                    const mesh = new THREE__namespace.Mesh(geom, new THREE__namespace.MeshPhongMaterial());
                    done(mesh);
                });

            } else if (/\.dae$/i.test(path)) {

                const loader = new ColladaLoader_js.ColladaLoader(manager);
                loader.load(path, dae => done(dae.scene));

            } else {

                console.warn(`URDFLoader: Could not load model at ${ path }.\nNo loader available`);

            }

        }

    };

    return URDFLoader;

}));
//# sourceMappingURL=URDFLoader.js.map
