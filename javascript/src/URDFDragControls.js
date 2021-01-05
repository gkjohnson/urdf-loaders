import { Raycaster, Vector3, Plane, Vector2 } from 'three';

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

const prevHitPoint = new Vector3();
const newHitPoint = new Vector3();
const pivotPoint = new Vector3();
const tempVector = new Vector3();
const tempVector2 = new Vector3();
const projectedStartPoint = new Vector3();
const projectedEndPoint = new Vector3();
const plane = new Plane();
export class URDFDragControls {

    constructor(scene) {

        this.enabled = true;
        this.scene = scene;
        this.raycaster = new Raycaster();
        this.initialGrabPoint = new Vector3();

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

export class PointerURDFDragControls extends URDFDragControls {

    constructor(scene, camera, domElement) {

        super(scene);
        this.camera = camera;
        this.domElement = domElement;

        const raycaster = new Raycaster();
        const mouse = new Vector2();

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
