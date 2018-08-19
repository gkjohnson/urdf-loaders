/* globals THREE */
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

/* URDFLoader Class */
// Loads and reads a URDF file into a THREEjs Object3D format
window.URDFLoader =
class URDFLoader {

    // Cached mesh loaders
    get STLLoader() {

        this._stlloader = this._stlloader || new THREE.STLLoader(this.manager);
        return this._stlloader;

    }

    get DAELoader() {

        this._daeloader = this._daeloader || new THREE.ColladaLoader(this.manager);
        return this._daeloader;

    }

    get TextureLoader() {

        this._textureloader = this._textureloader || new THREE.TextureLoader(this.manager);
        return this._textureloader;

    }

    constructor(manager) {

        this.manager = manager || THREE.DefaultLoadingManager;

    }

    /* Utilities */
    // forEach and filter function wrappers because
    // HTMLCollection does not the by default
    forEach(coll, func) {

        return [].forEach.call(coll, func);

    }
    filter(coll, func) {

        return [].filter.call(coll, func);

    }

    // take a vector "x y z" and process it into
    // an array [x, y, z]
    _processTuple(val) {

        if (!val) return [0, 0, 0];
        return val.trim().split(/\s+/g).map(num => parseFloat(num));

    }

    // applies a rotation a threejs object in URDF order
    _applyRotation(obj, rpy) {

        obj.rotateOnAxis(new THREE.Vector3(0, 0, 1), rpy[2]);
        obj.rotateOnAxis(new THREE.Vector3(0, 1, 0), rpy[1]);
        obj.rotateOnAxis(new THREE.Vector3(1, 0, 0), rpy[0]);

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

        const result = this._processUrdf(content, packages, options.workingPath, options.loadMeshCb);

        if (typeof onComplete === 'function') {

            onComplete(result);

        }

        return result;

    }

    // Default mesh loading function
    defaultMeshLoader(path, ext, done) {

        if (/\.stl$/i.test(path)) {

            this.STLLoader.load(path, geom => {

                const mesh = new THREE.Mesh();
                mesh.geometry = geom;
                done(mesh);

            });

        } else if (/\.dae$/i.test(path)) {

            this.DAELoader.load(path, dae => done(dae.scene));

        } else {

            console.warn(`URDFLoader: Could not load model at ${ path }.\nNo loader available`);

        }

    }

    /* Private Functions */

    // Resolves the path of mesh files
    _resolvePackagePath(pkg, meshPath, currPath) {

        if (!/^package:\/\//.test(meshPath)) {

            return currPath !== undefined ? currPath + meshPath : meshPath;

        }

        // Remove "package://" keyword and split meshPath at the first slash
        const [targetPkg, relPath] = meshPath.replace(/^package:\/\//, '').split(/\/(.+)/);

        if (typeof pkg === 'string') {

            // "pkg" is one single package
            if (pkg.endsWith(targetPkg)) {

                // "pkg" is the target package
                return pkg + '/' + relPath;

            } else {

                // Assume "pkg" is the target package's parent directory
                return pkg + '/' + targetPkg + '/' + relPath;

            }

        } else if (typeof pkg === 'object') {

            // "pkg" is a map of packages
            if (targetPkg in pkg) {

                return pkg[targetPkg] + '/' + relPath;

            } else {

                console.error(`URDFLoader : ${ targetPkg } not found in provided package list!`);
                return null;

            }
        }
    }

    // Process the URDF text format
    _processUrdf(data, packages, path, loadMeshCb) {

        const parser = new DOMParser();
        const urdf = parser.parseFromString(data, 'text/xml');

        const robottag = this.filter(urdf.children, c => c.nodeName === 'robot').pop();
        return this._processRobot(robottag, packages, path, loadMeshCb);

    }

    // Process the <robot> node
    _processRobot(robot, packages, path, loadMeshCb) {

        const links = [];
        const joints = [];
        const obj = new THREE.Object3D();
        obj.name = robot.getAttribute('name');

        // Process the <joint> and <link> nodes
        this.forEach(robot.children, n => {

            const type = n.nodeName.toLowerCase();
            if (type === 'link') links.push(n);
            else if (type === 'joint') joints.push(n);

        });

        // Create the <link> map
        const linkMap = {};
        this.forEach(links, l => {

            const name = l.getAttribute('name');
            linkMap[name] = this._processLink(l, packages, path, loadMeshCb);

        });

        // Create the <joint> map
        const jointMap = {};
        this.forEach(joints, j => {

            const name = j.getAttribute('name');
            jointMap[name] = this._processJoint(j, linkMap);

        });

        for (const key in linkMap) {

            if (linkMap[key].parent == null) {

                obj.add(linkMap[key]);

            }

        }

        obj.joints = jointMap;
        obj.links = linkMap;
        obj.isURDFRobot = true;
        obj.type = 'URDFRobot';

        return obj;

    }

    // Process joint nodes and parent them
    _processJoint(joint, linkMap) {

        const jointType = joint.getAttribute('type');
        const obj = new THREE.Object3D();
        obj.isURDFJoint = true;
        obj.type = 'URDFJoint';

        obj.name = joint.getAttribute('name');
        obj.jointType = jointType;
        obj.axis = null;
        obj.angle = 0;
        obj.limit = { lower: 0, upper: 0 };
        obj.ignoreLimits = false;
        obj.setOffset = () => {};

        // copy the 'setOffset' function over to 'setAngle' so
        // it makes sense for other joint types (prismatic, planar)
        // TODO: Remove the 'setOffset' function
        // TODO: Figure out how to handle setting and getting angles of other types
        Object.defineProperties(
            obj,
            {

                setAngle: { get() { return this.setOffset; } },

            });

        let parent = null;
        let child = null;
        let xyz = [0, 0, 0];
        let rpy = [0, 0, 0];

        // Extract the attributes
        this.forEach(joint.children, n => {

            const type = n.nodeName.toLowerCase();
            if (type === 'origin') {

                xyz = this._processTuple(n.getAttribute('xyz'));
                rpy = this._processTuple(n.getAttribute('rpy'));

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
        this._applyRotation(obj, rpy);
        obj.position.set(xyz[0], xyz[1], xyz[2]);

        // Set up the rotate function
        const origRot = new THREE.Quaternion().copy(obj.quaternion);
        const origPos = new THREE.Vector3().copy(obj.position);
        const axisnode = this.filter(joint.children, n => n.nodeName.toLowerCase() === 'axis')[0];

        if (axisnode) {

            const axisxyz = axisnode.getAttribute('xyz').split(/\s+/g).map(num => parseFloat(num));
            obj.axis = new THREE.Vector3(axisxyz[0], axisxyz[1], axisxyz[2]);
            obj.axis.normalize();

        }

        switch (jointType) {

            case 'fixed': break;
            case 'continuous':
                obj.limit.lower = -Infinity;
                obj.limit.upper = Infinity;

                // fall through to revolute joint 'setOffset' function
            case 'revolute':
                obj.setOffset = function(angle = null) {

                    if (!this.axis) return;
                    if (angle == null) return;

                    if (!this.ignoreLimits) {

                        angle = Math.min(this.limit.upper, angle);
                        angle = Math.max(this.limit.lower, angle);

                    }

                    // FromAxisAngle seems to rotate the opposite of the
                    // expected angle for URDF, so negate it here
                    const delta = new THREE.Quaternion().setFromAxisAngle(this.axis, angle);
                    obj.quaternion.multiplyQuaternions(origRot, delta);

                    this.angle = angle;

                };
                break;

            case 'prismatic':
                obj.setOffset = function(angle = null) {

                    if (!this.axis) return;
                    if (angle == null) return;

                    if (!this.ignoreLimits) {

                        angle = Math.min(this.limit.upper, angle);
                        angle = Math.max(this.limit.lower, angle);

                    }

                    obj.position.copy(origPos);
                    obj.position.addScaledVector(this.axis, angle);

                    this.angle = angle;

                };
                break;

            case 'floating':
            case 'planar':
                // TODO: Support these joint types
                console.warn(`'${ jointType }' joint not yet supported`);

        }

        return obj;

    }

    // Process the <link> nodes
    _processLink(link, packages, path, loadMeshCb) {

        const visualNodes = this.filter(link.children, n => n.nodeName.toLowerCase() === 'visual');
        const obj = new THREE.Object3D();
        obj.name = link.getAttribute('name');
        obj.isURDFLink = true;
        obj.type = 'URDFLink';

        this.forEach(visualNodes, vn => this._processVisualNode(vn, obj, packages, path, loadMeshCb));

        return obj;

    }

    // Process the visual nodes into meshes
    _processVisualNode(vn, linkObj, packages, path, loadMeshCb) {

        let xyz = [0, 0, 0];
        let rpy = [0, 0, 0];
        let scale = [1, 1, 1];

        const material = new THREE.MeshPhongMaterial();
        let primitiveModel = null;
        this.forEach(vn.children, n => {

            const type = n.nodeName.toLowerCase();
            if (type === 'geometry') {

                const geoType = n.children[0].nodeName.toLowerCase();
                if (geoType === 'mesh') {

                    const filename = n.children[0].getAttribute('filename');
                    const filePath = this._resolvePackagePath(packages, filename, path);

                    // file path is null if a package directory is not provided.
                    if (filePath !== null) {

                        const ext = filePath.match(/.*\.([A-Z0-9]+)$/i).pop() || '';
                        const scaleAttr = n.children[0].getAttribute('scale');
                        if (scaleAttr) scale = this._processTuple(scaleAttr);

                        loadMeshCb(filePath, ext, obj => {

                            if (obj) {

                                if (obj instanceof THREE.Mesh) {

                                    obj.material.copy(material);

                                }

                                linkObj.add(obj);

                                obj.position.set(xyz[0], xyz[1], xyz[2]);
                                obj.rotation.set(0, 0, 0);
                                obj.scale.set(scale[0], scale[1], scale[2]);
                                this._applyRotation(obj, rpy);

                            }

                        });

                    }

                } else if (geoType === 'box') {

                    primitiveModel = new THREE.Mesh();
                    primitiveModel.geometry = new THREE.BoxGeometry(1, 1, 1);
                    primitiveModel.material = material;

                    const size = this._processTuple(n.children[0].getAttribute('size'));

                    linkObj.add(primitiveModel);
                    primitiveModel.scale.set(size[0], size[1], size[2]);

                } else if (geoType === 'sphere') {

                    primitiveModel = new THREE.Mesh();
                    primitiveModel.geometry = new THREE.SphereGeometry(1, 30, 30);
                    primitiveModel.material = material;

                    const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                    primitiveModel.scale.set(radius, radius, radius);

                    linkObj.add(primitiveModel);

                } else if (geoType === 'cylinder') {

                    const radius = parseFloat(n.children[0].getAttribute('radius')) || 0;
                    const length = parseFloat(n.children[0].getAttribute('length')) || 0;

                    primitiveModel = new THREE.Object3D();
                    const mesh = new THREE.Mesh();
                    mesh.geometry = new THREE.CylinderBufferGeometry(1, 1, 1, 30);
                    mesh.material = material;
                    mesh.scale.set(radius, length, radius);

                    primitiveModel.add(mesh);
                    mesh.rotation.set(Math.PI / 2, 0, 0);

                    linkObj.add(primitiveModel);
                    this._applyRotation(primitiveModel, rpy);
                    primitiveModel.position.set(xyz[0], xyz[1], xyz[2]);

                }

            } else if (type === 'origin') {

                xyz = this._processTuple(n.getAttribute('xyz'));
                rpy = this._processTuple(n.getAttribute('rpy'));

            } else if (type === 'material') {

                this.forEach(n.children, c => {

                    if (c.nodeName.toLowerCase() === 'color') {

                        const rgba = c.getAttribute('rgba')
                            .split(/\s/g)
                            .map(v => parseFloat(v));

                        material.color.r = rgba[0];
                        material.color.g = rgba[1];
                        material.color.b = rgba[2];
                        material.opacity = rgba[3];

                        if (material.opacity < 1) material.transparent = true;

                    } else if (c.nodeName.toLowerCase() === 'texture') {

                        const filename = c.getAttribute('filename').replace(/^(package:\/\/)/, '');
                        const filePath = this._resolvePackagePath(packages, filename, path);

                        material.map = this._textureloader.load(filePath);

                    }

                });

            }

        });

        // apply the position and rotation to the primitive geometry after
        // the fact because it's guaranteed to have been scraped from the child
        // nodes by this point
        if (primitiveModel) {

            this._applyRotation(primitiveModel, rpy);
            primitiveModel.position.set(xyz[0], xyz[1], xyz[2]);

        }

    }

};
