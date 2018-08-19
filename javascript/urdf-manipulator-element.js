/* globals URDFViewer THREE */

// urdf-manipulator element
// Displays a URDF model that can be manipulated with the mouse

// Events
// joint-mouseover: Fired when a joint is hovered over
// joint-mouseout: Fired when a joint is no longer hovered over
// manipulate-start: Fires when a joint is manipulated
// manipulate-end: Fires when a joint is done being manipulated
window.URDFManipulator =
class URDFManipulator extends URDFViewer {

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
            new THREE.MeshPhongMaterial({
                shininess: 10,
                color: this.highlightColor,
                emissive: this.highlightColor,
                emissiveIntensity: 0.25,
            });

        const el = this.renderer.domElement;

        // Saved mouse data between frames and initial
        // click point in space
        const mouse = new THREE.Vector2();
        const lastMouse = new THREE.Vector2();
        const clickPoint = new THREE.Vector3();

        // Reuseable variables
        const raycaster = new THREE.Raycaster();
        const delta = new THREE.Vector2();
        const plane = new THREE.Plane();
        const line = new THREE.Line3();

        // The joint being manipulated
        let dragging = null;

        const toMouseCoord = (e, v) => {

            v.x = ((e.pageX - el.offsetLeft) / el.offsetWidth) * 2 - 1;
            v.y = -((e.pageY - el.offsetTop) / el.offsetHeight) * 2 + 1;

        };

        // Get which part of the robot is hit by the mouse click
        const getCollisions = m => {

            if (!this.robot) return [];

            raycaster.setFromCamera(m, this.camera);

            const meshes = [];
            this.robot.traverse(c => c.type === 'Mesh' && meshes.push(c));

            return raycaster.intersectObjects(meshes);

        };

        const isJoint = j => {

            return j.isURDFJoint && j.jointType !== 'fixed';

        };

        // Find the nearest parent that is a joint
        const findNearestJoint = m => {

            let curr = m;
            while (curr) {

                if (isJoint(curr)) {

                    break;

                }

                curr = curr.parent;

            }

            return curr;

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

                        traverse(c.children[i]);

                    }

                }

            };

            traverse(m);

        };

        const temp = new THREE.Vector3();
        const intersect1 = new THREE.Vector3();
        const intersect2 = new THREE.Vector3();

        // Get the changed angle between mouse position 1 and 2
        // when manipulating target
        const getAngle = (tg, m1, m2) => {

            // TODO: Why is the constant negated?
            plane.normal.copy(tg.axis).transformDirection(tg.matrixWorld).normalize();
            plane.constant = -plane.normal.dot(clickPoint);

            // If the camera is looking at the rotation axis at a skewed angle
            temp.copy(this.camera.position).sub(clickPoint).normalize();
            if (Math.abs(temp.dot(plane.normal)) < 0.2) {

                // distance to the clicked point
                const dist = temp.copy(clickPoint).sub(this.camera.position).length() * 0.9;

                // Get the point closest to the original clicked point
                // and use that as center of the rotation axis
                temp.set(0, 0, 0).applyMatrix4(tg.matrixWorld);
                temp.addScaledVector(plane.normal, -plane.distanceToPoint(temp));

                // Project out from the camera
                raycaster.setFromCamera(m1, this.camera);
                intersect1.copy(raycaster.ray.origin).add(
                    raycaster.ray.direction.normalize().multiplyScalar(dist)
                );
                intersect1.sub(temp);

                raycaster.setFromCamera(m2, this.camera);
                intersect2.copy(raycaster.ray.origin).add(
                    raycaster.ray.direction.normalize().multiplyScalar(dist)
                );
                intersect2.sub(temp);

                temp.crossVectors(intersect2, intersect1).normalize();

                // Multiply by a magic number to make it feel good
                return temp.dot(plane.normal) * intersect2.angleTo(intersect1) * 2;

            } else {

                // Get the point closest to the original clicked point
                // and use that as center of the rotation axis
                temp.set(0, 0, 0).applyMatrix4(tg.matrixWorld);
                temp.addScaledVector(plane.normal, -plane.distanceToPoint(temp));

                // project onto the plane of rotation
                raycaster.setFromCamera(m1, this.camera);
                line.start.copy(raycaster.ray.origin);
                line.end.copy(raycaster.ray.origin).add(raycaster.ray.direction.normalize().multiplyScalar(1e5));
                plane.intersectLine(line, intersect1);
                intersect1.sub(temp);

                raycaster.setFromCamera(m2, this.camera);
                line.start.copy(raycaster.ray.origin);
                line.end.copy(raycaster.ray.origin).add(raycaster.ray.direction.normalize().multiplyScalar(1e5));
                plane.intersectLine(line, intersect2);
                intersect2.sub(temp);

                temp.crossVectors(intersect2, intersect1);

                return Math.sign(temp.dot(plane.normal)) * intersect2.angleTo(intersect1);

            }

        };

        // Get the amount to move the prismatic joint based on the mouse move
        const getMove = (tg, m1, m2) => {

            const dist = temp.copy(clickPoint).sub(this.camera.position).length();

            raycaster.setFromCamera(m1, this.camera);
            raycaster.ray.direction.normalize().multiplyScalar(dist);
            intersect1.copy(raycaster.ray.origin).add(raycaster.ray.direction);

            raycaster.setFromCamera(m2, this.camera);
            raycaster.ray.direction.normalize().multiplyScalar(dist);
            intersect2.copy(raycaster.ray.origin).add(raycaster.ray.direction);

            temp.copy(intersect2).sub(intersect1);

            plane.normal.copy(tg.axis).transformDirection(tg.parent.matrixWorld).normalize();

            return temp.length() * -Math.sign(temp.dot(plane.normal));

        };

        el.addEventListener('mousedown', e => {

            if (this.disableDragging) return;

            toMouseCoord(e, mouse);
            lastMouse.copy(mouse);

            // get the information on the clicked item
            // and set the dragged joint
            const target = getCollisions(mouse).shift();
            if (target) {

                dragging = findNearestJoint(target.object);

                if (dragging) {

                    clickPoint.copy(target.point);
                    this.dispatchEvent(new CustomEvent('manipulate-start', { bubbles: true, cancelable: true, detail: dragging.name }));
                    this.controls.enabled = false;

                }

            }

        }, true);

        let hovered = null;
        this._mouseMoveFunc = e => {

            toMouseCoord(e, mouse);
            delta.copy(mouse).sub(lastMouse);

            // Keep track of the hovered item. If an item is being
            // dragged, then it is considered hovered
            const wasHovered = hovered;
            if (hovered) {

                hovered = null;
            }

            if (dragging == null && this.disableDragging === false) {

                const collision = getCollisions(mouse).shift() || null;
                const joint = collision && findNearestJoint(collision.object);
                if (joint) {

                    hovered = joint;

                }

            } else if (dragging) {

                hovered = dragging;

            }

            // Highlight the meshes and broadcast events if the hovered item changed
            if (hovered !== wasHovered) {

                if (wasHovered) {

                    highlightLinkGeometry(wasHovered, true);
                    this.dispatchEvent(new CustomEvent('joint-mouseout', { bubbles: true, cancelable: true, detail: wasHovered.name }));

                }

                if (hovered) {

                    highlightLinkGeometry(hovered, false);
                    this.dispatchEvent(new CustomEvent('joint-mouseover', { bubbles: true, cancelable: true, detail: hovered.name }));

                }

                this.redraw();

            }

            // Apply the manipulation
            if (dragging !== null) {

                let delta = null;
                if (dragging.jointType === 'revolute' || dragging.jointType === 'continuous') {

                    delta = getAngle(dragging, mouse, lastMouse);

                } else if (dragging.jointType === 'prismatic') {

                    delta = getMove(dragging, mouse, lastMouse);

                } else {

                    // Not supported

                }

                if (delta) {

                    this.setAngle(dragging.name, dragging.angle + delta);

                }

            }

            lastMouse.copy(mouse);

        };

        // Clean up
        this._mouseUpFunc = e => {

            if (dragging) {

                this.dispatchEvent(new CustomEvent('manipulate-end', { bubbles: true, cancelable: true, detail: dragging.name }));
                dragging = null;
                this.controls.enabled = true;

            }

        };

    }

    connectedCallback() {

        super.connectedCallback();
        window.addEventListener('mousemove', this._mouseMoveFunc, true);
        window.addEventListener('mouseup', this._mouseUpFunc, true);

    }

    disconnectedCallback() {

        super.disconnectedCallback();
        window.removeEventListener('mousemove', this._mouseMoveFunc, true);
        window.removeEventListener('mouseup', this._mouseUpFunc, true);

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
