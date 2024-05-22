(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('three'), require('./urdf-viewer-element.js')) :
    typeof define === 'function' && define.amd ? define(['three', './urdf-viewer-element'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.URDFManipulator = factory(global.THREE, global.URDFViewer));
})(this, (function (THREE, URDFViewer) { 'use strict';

    function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

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
    var URDFViewer__default = /*#__PURE__*/_interopDefaultLegacy(URDFViewer);

    // Find the nearest parent that is a joint
    function isJoint(j) {

        return j.isURDFJoint && j.jointType !== 'fixed';

    };

    function findNearestJoint(child) {

        let curr = child;
        while (curr) {

            if (isJoint(curr)) {

                return curr;

            }

            curr = curr.parent;

        }

        return curr;

    };

    const prevHitPoint = new THREE.Vector3();
    const newHitPoint = new THREE.Vector3();
    const pivotPoint = new THREE.Vector3();
    const tempVector = new THREE.Vector3();
    const tempVector2 = new THREE.Vector3();
    const projectedStartPoint = new THREE.Vector3();
    const projectedEndPoint = new THREE.Vector3();
    const plane = new THREE.Plane();
    class URDFDragControls {

        constructor(scene) {

            this.enabled = true;
            this.scene = scene;
            this.raycaster = new THREE.Raycaster();
            this.initialGrabPoint = new THREE.Vector3();

            this.hitDistance = -1;
            this.hovered = null;
            this.manipulating = null;

        }

        update() {

            const {
                raycaster,
                hovered,
                manipulating,
                scene,
            } = this;

            if (manipulating) {

                return;

            }

            let hoveredJoint = null;
            const intersections = raycaster.intersectObject(scene, true);
            if (intersections.length !== 0) {

                const hit = intersections[0];
                this.hitDistance = hit.distance;
                hoveredJoint = findNearestJoint(hit.object);
                this.initialGrabPoint.copy(hit.point);

            }

            if (hoveredJoint !== hovered) {

                if (hovered) {

                    this.onUnhover(hovered);

                }

                this.hovered = hoveredJoint;

                if (hoveredJoint) {

                    this.onHover(hoveredJoint);

                }

            }

        }

        updateJoint(joint, angle) {

            joint.setJointValue(angle);

        }

        onDragStart(joint) {

        }

        onDragEnd(joint) {

        }

        onHover(joint) {

        }

        onUnhover(joint) {

        }

        getRevoluteDelta(joint, startPoint, endPoint) {

            // set up the plane
            tempVector
                .copy(joint.axis)
                .transformDirection(joint.matrixWorld)
                .normalize();
            pivotPoint
                .set(0, 0, 0)
                .applyMatrix4(joint.matrixWorld);
            plane
                .setFromNormalAndCoplanarPoint(tempVector, pivotPoint);

            // project the drag points onto the plane
            plane.projectPoint(startPoint, projectedStartPoint);
            plane.projectPoint(endPoint, projectedEndPoint);

            // get the directions relative to the pivot
            projectedStartPoint.sub(pivotPoint);
            projectedEndPoint.sub(pivotPoint);

            tempVector.crossVectors(projectedStartPoint, projectedEndPoint);

            const direction = Math.sign(tempVector.dot(plane.normal));
            return direction * projectedEndPoint.angleTo(projectedStartPoint);

        }

        getPrismaticDelta(joint, startPoint, endPoint) {

            tempVector.subVectors(endPoint, startPoint);
            plane
                .normal
                .copy(joint.axis)
                .transformDirection(joint.parent.matrixWorld)
                .normalize();

            return tempVector.dot(plane.normal);

        }

        moveRay(toRay) {

            const { raycaster, hitDistance, manipulating } = this;
            const { ray } = raycaster;

            if (manipulating) {

                ray.at(hitDistance, prevHitPoint);
                toRay.at(hitDistance, newHitPoint);

                let delta = 0;
                if (manipulating.jointType === 'revolute' || manipulating.jointType === 'continuous') {

                    delta = this.getRevoluteDelta(manipulating, prevHitPoint, newHitPoint);

                } else if (manipulating.jointType === 'prismatic') {

                    delta = this.getPrismaticDelta(manipulating, prevHitPoint, newHitPoint);

                }

                if (delta) {

                    this.updateJoint(manipulating, manipulating.angle + delta);

                }

            }

            this.raycaster.ray.copy(toRay);
            this.update();

        }

        setGrabbed(grabbed) {

            const { hovered, manipulating } = this;

            if (grabbed) {

                if (manipulating !== null || hovered === null) {

                    return;

                }

                this.manipulating = hovered;
                this.onDragStart(hovered);

            } else {

                if (this.manipulating === null) {
                    return;
                }

                this.onDragEnd(this.manipulating);
                this.manipulating = null;
                this.update();

            }

        }

    }

    class PointerURDFDragControls extends URDFDragControls {

        constructor(scene, camera, domElement) {

            super(scene);
            this.camera = camera;
            this.domElement = domElement;

            const raycaster = new THREE.Raycaster();
            const mouse = new THREE.Vector2();

            function updateMouse(e) {

                mouse.x = ((e.pageX - domElement.offsetLeft) / domElement.offsetWidth) * 2 - 1;
                mouse.y = -((e.pageY - domElement.offsetTop) / domElement.offsetHeight) * 2 + 1;

            }

            this._mouseDown = e => {

                updateMouse(e);
                raycaster.setFromCamera(mouse, this.camera);
                this.moveRay(raycaster.ray);
                this.setGrabbed(true);

            };

            this._mouseMove = e => {

                updateMouse(e);
                raycaster.setFromCamera(mouse, this.camera);
                this.moveRay(raycaster.ray);

            };

            this._mouseUp = e => {

                updateMouse(e);
                raycaster.setFromCamera(mouse, this.camera);
                this.moveRay(raycaster.ray);
                this.setGrabbed(false);

            };

            domElement.addEventListener('mousedown', this._mouseDown);
            domElement.addEventListener('mousemove', this._mouseMove);
            domElement.addEventListener('mouseup', this._mouseUp);

        }

        getRevoluteDelta(joint, startPoint, endPoint) {

            const { camera, initialGrabPoint } = this;

            // set up the plane
            tempVector
                .copy(joint.axis)
                .transformDirection(joint.matrixWorld)
                .normalize();
            pivotPoint
                .set(0, 0, 0)
                .applyMatrix4(joint.matrixWorld);
            plane
                .setFromNormalAndCoplanarPoint(tempVector, pivotPoint);

            tempVector
                .copy(camera.position)
                .sub(initialGrabPoint)
                .normalize();

            // if looking into the plane of rotation
            if (Math.abs(tempVector.dot(plane.normal)) > 0.3) {

                return super.getRevoluteDelta(joint, startPoint, endPoint);

            } else {

                // get the up direction
                tempVector.set(0, 1, 0).transformDirection(camera.matrixWorld);

                // get points projected onto the plane of rotation
                plane.projectPoint(startPoint, projectedStartPoint);
                plane.projectPoint(endPoint, projectedEndPoint);

                tempVector.set(0, 0, -1).transformDirection(camera.matrixWorld);
                tempVector.cross(plane.normal);
                tempVector2.subVectors(endPoint, startPoint);

                return tempVector.dot(tempVector2);

            }

        }

        dispose() {

            const { domElement } = this;
            domElement.removeEventListener('mousedown', this._mouseDown);
            domElement.removeEventListener('mousemove', this._mouseMove);
            domElement.removeEventListener('mouseup', this._mouseUp);

        }

    }

    // urdf-manipulator element
    // Displays a URDF model that can be manipulated with the mouse

    // Events
    // joint-mouseover: Fired when a joint is hovered over
    // joint-mouseout: Fired when a joint is no longer hovered over
    // manipulate-start: Fires when a joint is manipulated
    // manipulate-end: Fires when a joint is done being manipulated
    class URDFManipulator extends URDFViewer__default["default"] {

        static get observedAttributes() {

            return ['highlight-color', ...super.observedAttributes];

        }

        get disableDragging() { return this.hasAttribute('disable-dragging'); }
        set disableDragging(val) { val ? this.setAttribute('disable-dragging', !!val) : this.removeAttribute('disable-dragging'); }

        get highlightColor() { return this.getAttribute('highlight-color') || '#FFFFFF'; }
        set highlightColor(val) { val ? this.setAttribute('highlight-color', val) : this.removeAttribute('highlight-color'); }

        constructor(...args) {

            super(...args);

            // The highlight material
            this.highlightMaterial =
                new THREE__namespace.MeshPhongMaterial({
                    shininess: 10,
                    color: this.highlightColor,
                    emissive: this.highlightColor,
                    emissiveIntensity: 0.25,
                });

            const isJoint = j => {

                return j.isURDFJoint && j.jointType !== 'fixed';

            };

            // Highlight the link geometry under a joint
            const highlightLinkGeometry = (m, revert) => {

                const traverse = c => {

                    // Set or revert the highlight color
                    if (c.type === 'Mesh') {

                        if (revert) {

                            c.material = c.__origMaterial;
                            delete c.__origMaterial;

                        } else {

                            c.__origMaterial = c.material;
                            c.material = this.highlightMaterial;

                        }

                    }

                    // Look into the children and stop if the next child is
                    // another joint
                    if (c === m || !isJoint(c)) {

                        for (let i = 0; i < c.children.length; i++) {

                            const child = c.children[i];
                            if (!child.isURDFCollider) {

                                traverse(c.children[i]);

                            }

                        }

                    }

                };

                traverse(m);

            };

            const el = this.renderer.domElement;

            const dragControls = new PointerURDFDragControls(this.scene, this.camera, el);
            dragControls.onDragStart = joint => {

                this.dispatchEvent(new CustomEvent('manipulate-start', { bubbles: true, cancelable: true, detail: joint.name }));
                this.controls.enabled = false;
                this.redraw();

            };
            dragControls.onDragEnd = joint => {

                this.dispatchEvent(new CustomEvent('manipulate-end', { bubbles: true, cancelable: true, detail: joint.name }));
                this.controls.enabled = true;
                this.redraw();

            };
            dragControls.updateJoint = (joint, angle) => {

                this.setJointValue(joint.name, angle);

            };
            dragControls.onHover = joint => {

                highlightLinkGeometry(joint, false);
                this.dispatchEvent(new CustomEvent('joint-mouseover', { bubbles: true, cancelable: true, detail: joint.name }));
                this.redraw();

            };
            dragControls.onUnhover = joint => {

                highlightLinkGeometry(joint, true);
                this.dispatchEvent(new CustomEvent('joint-mouseout', { bubbles: true, cancelable: true, detail: joint.name }));
                this.redraw();

            };

            this.dragControls = dragControls;

        }

        disconnectedCallback() {

            super.disconnectedCallback();
            this.dragControls.dispose();

        }

        attributeChangedCallback(attr, oldval, newval) {

            super.attributeChangedCallback(attr, oldval, newval);

            switch (attr) {

                case 'highlight-color':
                    this.highlightMaterial.color.set(this.highlightColor);
                    this.highlightMaterial.emissive.set(this.highlightColor);
                    break;

            }

        }

    };

    return URDFManipulator;

}));
//# sourceMappingURL=urdf-manipulator-element.js.map
