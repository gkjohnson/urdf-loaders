// urdf-viewer element
// Loads and displays a 3D view of a URDF-formatted robot

// Events
// urdf-change: Fires when the URDF has finished loading and getting processed
// urdf-processed: Fires when the URDF has finished loading and getting processed
// geometry-loaded: Fires when all the geometry has been fully loaded
// ignore-limits-change: Fires when the 'ignore-limits' attribute changes 
window.URDFViewer =
class URDFViewer extends HTMLElement {

    static get observedAttributes() {
        return ['package', 'urdf', 'up', 'display-shadow', 'ambient-color', 'ignore-limits']
    }

    get package() { return this.getAttribute('package') || '' }
    set package(val) { this.setAttribute('package', val) } 
    
    get urdf() { return this.getAttribute('urdf') || '' }
    set urdf(val) { this.setAttribute('urdf', val) }

    get ignoreLimits() { return this.hasAttribute('ignore-limits') || false }
    set ignoreLimits(val) {
        val ? this.setAttribute('ignore-limits', val) : this.removeAttribute('ignore-limits')
    }

    get up() { return this.getAttribute('up') || '+Y' }
    set up(val) { this.setAttribute('up', val) }

    get displayShadow() { return this.hasAttribute('display-shadow') || false }
    set displayShadow(val) {
        val = !!val
        val ? this.setAttribute('display-shadow', '') : this.removeAttribute('display-shadow')
    }

    get ambientColor() { return this.getAttribute('ambient-color') || '#455A64' }
    set ambientColor(val) {
        val ? this.setAttribute('ambient-color', val) : this.removeAttribute('ambient-color')
    }

    get angles() {
        const angles = {}
        if (this.robot) {
            for (let name in this.robot.urdf.joints) angles[name] = this.robot.urdf.joints[name].urdf.angle
        }
        
        return angles
    }
    set angles(val) { this._setAngles(val) }

    get loadingManager() {
        return this._loadingManager = this._loadingManager || new THREE.LoadingManager();
    }

    get urdfLoader() {
        return this._urdfLoader = this._urdfLoader || new URDFLoader(this.loadingManager)
    }

    /* Lifecycle Functions */
    constructor() {
        super()

        this._requestId = 0
        this._dirty = false
        this.robot = null

        // Scene setup
        const scene = new THREE.Scene()

        const ambientLight = new THREE.AmbientLight(this.ambientColor)
        scene.add(ambientLight)

        // Light setup
        const dirLight = new THREE.DirectionalLight(0xffffff)
        dirLight.position.set(4, 10, 1)
        dirLight.shadow.mapSize.width = 2048
        dirLight.shadow.mapSize.height = 2048
        dirLight.castShadow = true
        
        scene.add(dirLight)

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
        renderer.setClearColor(0xffffff)
        renderer.setClearAlpha(0)
        renderer.shadowMap.enabled = true

        // Camera setup
        const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
        camera.position.z = -10

        // World setup
        const world = new THREE.Object3D()
        scene.add(world)

        const plane = new THREE.Mesh(
            new THREE.PlaneBufferGeometry( 40, 40 ),
            new THREE.ShadowMaterial( { side: THREE.DoubleSide, transparent: true, opacity: 0.25 } )
        )
        plane.rotation.x = -Math.PI/2
        plane.position.y = -0.5
        plane.receiveShadow = true
        plane.scale.set(10, 10, 10)
        scene.add(plane)

        // Controls setup
        const controls = new THREE.OrbitControls(camera, renderer.domElement)
        controls.rotateSpeed = 2.0
        controls.zoomSpeed = 5
        controls.panSpeed = 2
        controls.enableZoom = true
        controls.enablePan = true
        controls.enableDamping = false
        controls.maxDistance = 50
        controls.minDistance = 0.25
        controls.addEventListener('change', () => this._dirty = true)
        
        this.world = world
        this.renderer = renderer
        this.camera = camera
        this.controls = controls
        this.plane = plane
        this.ambientLight = ambientLight

        const _do = () => {
            if(this.parentNode) {
                this.refresh()

                if (this._dirty) {
                    this._updateEnvironment()
                }

                // update controls after the environment in
                // case the controls are retargeted
                this.controls.update()

                if (this._dirty) {
                    this.renderer.render(scene, camera)
                    this._dirty = false
                }
            }
            this._renderLoopId = requestAnimationFrame(_do)
        }
        _do()

    }

    connectedCallback() {
        // Add our initialize styles for the element if they haven't
        // been added yet
        if (!this.constructor._styletag) {
            const styletag = document.createElement('style')
            styletag.innerHTML =
            `
                ${this.tagName} { display: block; }
                ${this.tagName} canvas {
                    width: 100%;
                    height: 100%;
                }
            `
            document.head.appendChild(styletag)
            this.constructor._styletag = styletag
        }

        // add the renderer
        if (this.childElementCount === 0) {
            this.appendChild(this.renderer.domElement)
        }

        this.refresh()
        requestAnimationFrame(() => this.refresh())
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._renderLoopId)
    }

    attributeChangedCallback(attr, oldval, newval) {
        this._dirty = true

        switch(attr) {
            case 'package':
            case 'urdf': {
                this._loadUrdf(this.package, this.urdf)
                break
            }

            case 'up': {
                this._setUp(this.up)
                break
            }

            case 'ambient-color': {
                this.ambientLight.color.set(this.ambientColor)
                break
            }

            case 'ignore-limits': {
                this._setIgnoreLimits(this.ignoreLimits, true)
                break
            }
        }
    }

    /* Public API */
    refresh() {
        const r = this.renderer
        const w = this.clientWidth
        const h = this.clientHeight
        const currsize = r.getSize()

        if (currsize.width != w || currsize.height != h) {
            this._dirty = true
        }

        r.setPixelRatio(window.devicePixelRatio)
        r.setSize(w, h, false)

        this.camera.aspect = w / h
        this.camera.updateProjectionMatrix();
    }

    // Set the joint with jointname to
    // angle in degrees
    setAngle(jointname, angle) {
        if (!this.robot) return

        const joint = this.robot.urdf.joints[jointname]
        if (joint && joint.urdf.angle !== angle) {
            joint.urdf.setAngle(angle)
            this._dirty = true
        }
    }
    
    setAngles(angles) {
        for(name in angles) this.setAngle(name, angles[name])
    }

    /* Private Functions */
    // Updates the position of the plane to be at the
    // lowest point below the robot and focuses the 
    // camera on the center of the scene
    _updateEnvironment() {
        this.plane.visible = this.displayShadow
        if(this.robot && this.displayShadow) {
            this.world.updateMatrixWorld()

            const bbox = new THREE.Box3().setFromObject(this.robot)
            this.controls.target.y = bbox.getCenter(new THREE.Vector3()).y
            this.plane.position.y = bbox.min.y - 1e-3
        }
    }

    // Watch the package and urdf field and load the 
    _loadUrdf(pkg, urdf) {
        const _dispose = item => {
            if (!item) return
            if (item.parent) item.parent.remove(item)
            if (item.dispose) item.dispose()
            item.children.forEach(c => _dispose(c))
        }

        if (this._prevload === `${pkg}|${urdf}`) return

        _dispose(this.robot)
        this.robot = null

        this.dispatchEvent(new CustomEvent('urdf-change', { bubbles: true, cancelable: true, composed: true }))

        if (pkg && urdf) {
            this._prevload = `${pkg}|${urdf}`

            // Keep track of this request and make
            // sure it doesn't get overwritten by
            // a subsequent one
            this._requestId ++
            const requestId = this._requestId

            let totalMeshes = 0
            let meshesLoaded = 0
            this.urdfLoader.load(
                pkg,
                urdf,
                
                // Callback with array of robots
                robot => {
                    // If another request has come in to load a new
                    // robot, then ignore this one
                    if (this._requestId !== requestId) {
                        _dispose(robot)
                        return
                    }

                    this.robot = robot
                    this.world.add(robot)

                    this._setIgnoreLimits(this.ignoreLimits)

                    this.dispatchEvent(new CustomEvent('urdf-processed', { bubbles: true, cancelable: true, composed: true }))
                },

                // Load meshes and enable shadow casting
                (path, ext, done) => {
                    totalMeshes++
                    this.urdfLoader.defaultMeshLoader(path, ext, mesh => {
                        const _enableShadows = o => {
                            if (o instanceof THREE.Mesh) {
                                o.castShadow = true
                            }
                            o.children.forEach(c => _enableShadows(c))
                        }
                        _enableShadows(mesh)
                        done(mesh)

                        meshesLoaded++
                        if (meshesLoaded === totalMeshes && this._requestId === requestId) {
                            this.dispatchEvent(new CustomEvent('geometry-loaded', { bubbles: true, cancelable: true, composed: true }))
                        }

                        this._dirty = true
                    })
            },
            { mode: 'cors', credentials: 'same-origin' })
        }
    }

    // Watch the coordinate frame and update the
    // rotation of the scene to match
    _setUp(up) {
        if (!up) up = '+Y'
        up = up.toUpperCase()
        const sign = up.replace(/[^-+]/g, '')[0] || '+'
        const axis = up.replace(/[^XYZ]/gi, '')[0] || 'Y'

        const PI = Math.PI
        const HALFPI = PI / 2
        if (axis === 'X') this.world.rotation.set(0, 0, sign === '+' ? HALFPI : -HALFPI)
        if (axis === 'Z') this.world.rotation.set(sign === '+' ? HALFPI : -HALFPI, 0, 0)
        if (axis === 'Y') this.world.rotation.set(sign === '+' ? 0 : PI, 0, 0)
    }

    // Updates the current robot's angles to ignore
    // joint limits or not
    _setIgnoreLimits(ignore, dispatch = false) {
        if (this.robot) {
            Object
                .values(this.robot.urdf.joints)
                .forEach(joint => {
                    joint.urdf.ignoreLimits = ignore
                    joint.urdf.setAngle(joint.urdf.angle)
                })
        }

        if (dispatch) {
            this.dispatchEvent(new CustomEvent('ignore-limits-change', { bubbles: true, cancelable: true, composed: true }))
        }

    }
}
