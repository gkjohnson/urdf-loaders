/* URDFLoader Class */
// Loads and reads a URDF file into a THREEjs Object3D format
class URDFLoader {

    // Cached mesh loaders
    static get STLLoader() {
        this._stlloader = this._stlloader || new THREE.STLLoader()
        return this._stlloader
    }

    static get DAELoader() {
        this._daeloader = this._daeloader || new THREE.ColladaLoader()
        return this._daeloader
    }

    static get TextureLoader() {
        this._textureloader = this._textureloader || new THREE.TextureLoader()
        return this._textureloader
    }

    /* Utilities */
    // forEach and filter function wrappers because 
    // HTMLCollection does not the by default
    static forEach(coll, func)  { return [].forEach.call(coll, func) }
    static filter(coll, func)   { return [].filter.call(coll, func) }

    // take a vector "x y z" and process it into
    // an array [x, y, z]
    static _processTuple(val) {
        if (!val) return [0, 0, 0]
        return val.trim().split(/\s+/g).map(num => parseFloat(num))
    }

    // applies a rotation a threejs object in URDF order
    static _applyRotation(obj, rpy) {
        obj.rotateOnAxis(new THREE.Vector3(0,0,1), rpy[2])
        obj.rotateOnAxis(new THREE.Vector3(0,1,0), rpy[1])
        obj.rotateOnAxis(new THREE.Vector3(1,0,0), rpy[0])
    }

    /* Public API */
    // pkg:     The equivelant of a ROS package:// directory
    // urdf:    The URDF path in the directory
    // cb:      Callback that is passed the model once loaded
    static load(pkg, urdf, cb, loadMeshCb) {
        loadMeshCb = loadMeshCb || this.defaultMeshLoader

        const path = `${pkg}/${urdf}`
        fetch(path, { credentials:'include' })
            .then(res => res.text())
            .then(data => this.loadStr(pkg, data, cb, loadMeshCb))
    }

    static loadStr(pkg, content, cb, loadMeshCb) {
        cb(this._processUrdf(pkg, content, loadMeshCb))
    }

    // Default mesh loading function
    static defaultMeshLoader(path, ext, done) {

        if (/\.stl$/i.test(path))
            URDFLoader.STLLoader.load(path, geom => {
                const mesh = new THREE.Mesh()
                mesh.geometry = geom
                done(mesh)
            })
        else if (/\.dae$/i.test(path))
            URDFLoader.DAELoader.load(path, dae => done(dae.scene))
        else
            console.warn(`Could note load model at ${path}:\nNo loader available`)
    }

    /* Private Functions */
    // Process the URDF text format
    static _processUrdf(pkg, data, loadMeshCb) {
        const parser = new DOMParser()
        const urdf = parser.parseFromString(data, 'text/xml')

        const res = []
        URDFLoader.forEach(urdf.children, n => res.push(this._processRobot(pkg, n, loadMeshCb)))

        return res
    }

    // Process the <robot> node
    static _processRobot(pkg, robot, loadMeshCb) {
        const links = []
        const joints = []
        const obj = new THREE.Object3D()
        obj.name = robot.getAttribute('name')
        obj.urdf = { node: robot }

        // Process the <joint> and <link> nodes
        URDFLoader.forEach(robot.children, n => {
            const type = n.nodeName.toLowerCase()
            if (type === 'link')        links.push(n)
            else if (type === 'joint')  joints.push(n)
        })

        // Create the <link> map
        const linkMap = {}
        URDFLoader.forEach(links, l => {
            const name = l.getAttribute('name')
            linkMap[name] = this._processLink(pkg, l, loadMeshCb)
        })

        // Create the <joint> map
        const jointMap = {}
        URDFLoader.forEach(joints, j => {
            const name = j.getAttribute('name')
            jointMap[name] = this._processJoint(j, linkMap)
        })

        for (let key in linkMap) linkMap[key].parent ? null : obj.add(linkMap[key])

        obj.urdf.joints = jointMap
        obj.urdf.links = linkMap

        return obj
    }

    // Process joint nodes and parent them
    static _processJoint(joint, linkMap) {
        const jointType = joint.getAttribute('type')
        const obj = new THREE.Object3D()
        obj.name = joint.getAttribute('name')
        obj.urdf = { node: joint, type: jointType, angle: 0 }

        let parent = null
        let child = null
        let xyz = null
        let rpy = null
        let limit = { min: -Infinity, max: Infinity }

        // Extract the attributes
        URDFLoader.forEach(joint.children, n => {
            const type = n.nodeName.toLowerCase()
            if (type === 'origin') {
                xyz = this._processTuple(n.getAttribute('xyz'))
                rpy = this._processTuple(n.getAttribute('rpy'))                    
            } else if(type === 'child') {
                child = linkMap[n.getAttribute('link')]
            } else if(type === 'parent') {
                parent = linkMap[n.getAttribute('link')]
            } else if(type === 'limit') {
                limit.min = parseFloat(n.getAttribute('lower') || limit.min)
                limit.max = parseFloat(n.getAttribute('upper') || limit.max)
            }
        })

        // Join the links
        parent.add(obj)
        obj.add(child)
        this._applyRotation(obj, rpy)
        obj.position.set(xyz[0], xyz[1], xyz[2])

        // Set up the rotate function
        const origRot = new THREE.Quaternion().copy(obj.quaternion)
        const axisnode = URDFLoader.filter(joint.children, n => n.nodeName.toLowerCase() === 'axis')[0]
        let axis = null

        if (axisnode) {
            const axisxyz = axisnode.getAttribute('xyz').split(/\s+/g).map(num => parseFloat(num))
            axis = new THREE.Vector3(axisxyz[0], axisxyz[1], axisxyz[2])
        }

        if (jointType === 'revolute') {
            obj.urdf.min = limit.min
            obj.urdf.max = limit.max

            obj.urdf.setAngle = angle => {
                if (!axis) return

                angle = Math.min(limit.max, angle)
                angle = Math.max(limit.min, angle)

                // FromAxisAngle seems to rotate the opposite of the
                // expected angle for URDF, so negate it here
                angle *= -1

                const delta = new THREE.Quaternion().setFromAxisAngle(axis, angle)
                obj.quaternion.multiplyQuaternions(origRot, delta)
                obj.urdf.angle = angle
            }
        }

        return obj
    }

    // Process the <link> nodes
    static _processLink(pkg, link, loadMeshCb) {
        const visualNodes = URDFLoader.filter(link.children, n => n.nodeName.toLowerCase() === 'visual')
        const obj = new THREE.Object3D()
        obj.name = link.getAttribute('name')
        obj.urdf = { node: link }

        URDFLoader.forEach(visualNodes, vn => this._processVisualNode(pkg, vn, obj, loadMeshCb))

        return obj
    }

    // Process the visual nodes into meshes
    static _processVisualNode(pkg, vn, linkObj, loadMeshCb) {
        let xyz = null
        let rpy = null
        let mesh = null

        const material = new THREE.MeshLambertMaterial()
        URDFLoader.forEach(vn.children, n => {
            const type = n.nodeName.toLowerCase()
            if (type === 'geometry') {
                const geoType = n.children[0].nodeName.toLowerCase()
                if (geoType === 'mesh') {
                    const filename = n.children[0].getAttribute('filename').replace(/^((package:\/\/)|(model:\/\/))/, '')
                    const path = pkg + '/' + filename
                    const ext = path.match(/.*\.([A-Z0-9]+)$/i).pop() || ''

                    loadMeshCb(path, ext, obj => {
                        if (obj) {
                            if (obj instanceof THREE.Mesh) {
                                obj.material = material
                            }

                            linkObj.add(obj)

                            obj.position.set(xyz[0], xyz[1], xyz[2])
                            obj.rotation.set(0,0,0)
                            this._applyRotation(obj, rpy)                            
                        }
                    })
                } else if (geoType === 'box') {
                    requestAnimationFrame(() => {
                        const mesh = new THREE.Mesh()
                        mesh.geometry = new THREE.BoxGeometry(1, 1, 1)
                        mesh.material = material

                        const size = this._processTuple(n.children[0].getAttribute('size'))

                        linkObj.add(mesh)
                        this._applyRotation(mesh, rpy)
                        mesh.position.set(xyz[0], xyz[1], xyz[2])
                        mesh.scale.set(size[0], size[1], size[2])
                    })
                } else if (geoType === 'sphere') {
                    requestAnimationFrame(() => {
                        const mesh = new THREE.Mesh()
                        mesh.geometry = new THREE.SphereGeometry(1, 20, 20)
                        mesh.material = material

                        const radius = parseFloat(n.children[0].getAttribute('radius')) || 0
                        mesh.position.set(xyz[0], xyz[1], xyz[2])
                        mesh.scale.set(radius, radius, radius)
                    })
                } else if (geoType === 'cylinder') {
                    requestAnimationFrame(() => {
                        const radius = parseFloat(n.children[0].getAttribute('radius')) || 0
                        const length = parseFloat(n.children[0].getAttribute('length')) || 0

                        const mesh = new THREE.mesh()
                        mesh.geometry = new THREE.CylinderBufferGeometry(1, 1, 1, 25)
                        mesh.material = material
                        mesh.scale.set(radius, length, radius)

                        const obj = new THREE.Object3D()
                        obj.add(mesh)
                        mesh.rotation.set(Math.PI, 0, 0)

                        linkObj.add(obj)
                        this._applyRotation(obj, rpy)
                        obj.position.set(xyz[0], xyz[1], xyz[2])
                        obj.scale.set(size[0], size[1], size[2])
                    })
                }
            } else if(type === 'origin') {
                xyz = this._processTuple(n.getAttribute('xyz'))
                rpy = this._processTuple(n.getAttribute('rpy'))
            } else if(type === 'material') {
                URDFLoader.forEach(n.children, c => {

                    if (c.nodeName.toLowerCase() === 'color') {
                        let rgba = c.getAttribute('rgba')
                            .split(/\s/g)
                            .map(v => parseFloat(v))

                        material.color.r = rgba[0]
                        material.color.g = rgba[1]
                        material.color.b = rgba[2]
                        material.opacity = rgba[3]

                        if (material.opacity < 1) material.transparent = true

                    } else if (c.nodeName.toLowerCase() === 'texture') {
                        const filename = c.getAttribute('filename').replace(/^(package:\/\/)/, '')
                        const path = pkg + '/' + filename
                        material.map = this._textureloader.load(path)
                    }
                })
            }
        })
    }
}

window.URDFLoader = URDFLoader