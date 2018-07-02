/* globals URDFViewer THREE */

// urdf-manipulator element
// Displays a URDF model that can be manipulated with the mouse

// Events
// joint-mouseover: Fired when a joint is hovered over
// joint-mouseout: Fired when a joint is no longer hovered over
// manipulate-start: Fires when a joint is manipulated
// manipulate-end: Fires when a joint is done being manipulated
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

        const el = this.renderer.domElement;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const lastMouse = new THREE.Vector2();
        const clickedMouse = new THREE.Vector2();
        const clickPoint = new THREE.Vector3();
        const delta = new THREE.Vector2();
        const clickedDelta = new THREE.Vector2();
        const plane = new THREE.Plane();
        const line = new THREE.Line3();

        let dragging = null;

        const toMouseCoord = (e, v) => {

            v.x = ((e.pageX - el.offsetLeft) / el.offsetWidth) * 2 - 1;
            v.y = -((e.pageY - el.offsetTop) / el.offsetHeight) * 2 + 1;

        };

        const getCollisions = m => {

            if (!this.robot) return [];

            raycaster.setFromCamera(m, this.camera);

            const meshes = [];
            this.robot.traverse(c => c.type === 'Mesh' && meshes.push(c));

            return raycaster.intersectObjects(meshes);

        };

        const findNearestJoint = m => {

            let curr = m;
            while (curr) {

                if (curr.urdf && curr.urdf.type && curr.urdf.type !== 'fixed') {

                    break;

                }

                curr = curr.parent;

            }

            return curr;

        };

        this.highlightMaterial = new THREE.MeshPhongMaterial({ shininess: 10, color: this.highlightColor, emissive: this.highlightColor, emissiveIntensity: 0.25 });
        const highlightLinkGeometry = (m, revert) => {

            const traverse = c => {

                if (c.type === 'Mesh') {

                    if (revert) {

                        c.material = c.__origMaterial;
                        delete c.__origMaterial;

                    } else {

                        c.__origMaterial = c.material;
                        c.material = this.highlightMaterial;

                    }

                }

                if (c === m || !c.urdf || !c.urdf.type || c.urdf.type === 'fixed') {

                    for (let i = 0; i < c.children.length; i++) {

                        traverse(c.children[i]);

                    }

                }

            };

            traverse(m);

        };

        const temp = new THREE.Vector3();
        const temp2 = new THREE.Vector3();
        const intersect1 = new THREE.Vector3();
        const intersect2 = new THREE.Vector3();

        const getAngle = (tg, m1, m2) => {

            // TODO: Why is the constant negated?
            plane.normal.copy(tg.urdf.axis).transformDirection(tg.matrixWorld).normalize();
            plane.constant = -plane.normal.dot(clickPoint);

            // If the camera is looking at the rotation axis at a skewed angle
            temp.set(0, 0, -1).transformDirection(this.camera.matrixWorld);
            if (Math.abs(temp.dot(plane.normal)) < 0.25) {

                temp.set(0, 0, 0).applyMatrix4(tg.matrixWorld);

                // Just project out from the camera
                raycaster.setFromCamera(m1, this.camera);
                intersect1.copy(raycaster.ray.origin).add(raycaster.ray.direction);
                intersect1.sub(temp);

                raycaster.setFromCamera(m2, this.camera);
                intersect2.copy(raycaster.ray.origin).add(raycaster.ray.direction);
                intersect2.sub(temp);

                temp.crossVectors(intersect2, intersect1);

                // Multiply by the magic number 10 to make it feel good
                return Math.sign(temp.dot(plane.normal)) * intersect2.angleTo(intersect1) * 10;

            } else {

                // Get the point closest to the original clicked point
                // and use that as center of the rotation axis
                temp.set(0, 0, 0).applyMatrix4(tg.matrixWorld);
                temp2.copy(plane.normal).multiplyScalar(-plane.distanceToPoint(temp));
                temp.add(temp2);

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

        const getMove = (tg, m1, m2) => {

            const dist = temp.copy(clickPoint).sub(this.camera.position).length();

            raycaster.setFromCamera(m1, this.camera);
            raycaster.ray.direction.normalize().multiplyScalar(dist);
            intersect1.copy(raycaster.ray.origin).add(raycaster.ray.direction);

            raycaster.setFromCamera(m2, this.camera);
            raycaster.ray.direction.normalize().multiplyScalar(dist);
            intersect2.copy(raycaster.ray.origin).add(raycaster.ray.direction);

            temp.copy(intersect2).sub(intersect1);

            plane.normal.copy(tg.urdf.axis).transformDirection(tg.parent.matrixWorld).normalize();

            return temp.length() * -Math.sign(temp.dot(plane.normal));

        };

        el.addEventListener('mousedown', e => {

            if (this.disableDragging) return;

            toMouseCoord(e, mouse);
            lastMouse.copy(mouse);
            clickedMouse.copy(mouse);

            const target = getCollisions(mouse).shift();
            if (target) {

                dragging = findNearestJoint(target.object);
                clickPoint.copy(target.point);
                this.dispatchEvent(new CustomEvent('manipulate-start', { bubbles: true, cancelable: true, detail: dragging.urdf.name }));

            }

        }, true);

        let hovered = null;
        el.addEventListener('mousemove', e => {

            // TODO: How to handle the skewed axes?
            // take into account the first click position to help determine
            // which direction the node should be rotated

            toMouseCoord(e, mouse);
            delta.copy(mouse).sub(lastMouse);
            clickedDelta.copy(mouse).sub(clickedMouse);

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

            if (hovered !== wasHovered) {

                if (wasHovered) {

                    highlightLinkGeometry(wasHovered, true);
                    this.dispatchEvent(new CustomEvent('joint-mouseout', { bubbles: true, cancelable: true, detail: wasHovered.urdf.name }));

                }

                if (hovered) {

                    highlightLinkGeometry(hovered, false);
                    this.dispatchEvent(new CustomEvent('joint-mouseover', { bubbles: true, cancelable: true, detail: hovered.urdf.name }));

                }

                this.redraw();

            }

            if (dragging !== null) {

                let delta = null;
                if (dragging.urdf.type === 'revolute' || dragging.urdf.type === 'continuous') {

                    delta = getAngle(dragging, mouse, lastMouse);

                } else if (dragging.urdf.type === 'prismatic') {

                    delta = getMove(dragging, mouse, lastMouse);

                }

                if (delta) {

                    this.setAngle(dragging.urdf.name, dragging.urdf.angle + delta);

                }

                e.stopPropagation();
                e.preventDefault();

            }

            lastMouse.copy(mouse);

            return false;

        }, true);

        el.addEventListener('mouseup', e => {

            if (dragging) {

                this.dispatchEvent(new CustomEvent('manipulate-end', { bubbles: true, cancelable: true, detail: dragging.urdf.name }));
                dragging = null;

            }

        });

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

}