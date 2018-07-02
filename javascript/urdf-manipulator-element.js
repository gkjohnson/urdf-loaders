/* globals URDFViewer THREE */
class URDFManipulator extends URDFViewer {

    get disableDragging() { return this.hasAttribute('disable-dragging'); }
    set disableDragging(val) { val ? this.setAttribute('disable-dragging', !!val) : this.removeAttribute('disable-dragging'); }

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

        const temp = new THREE.Vector3();
        const intersect1 = new THREE.Vector3();
        const intersect2 = new THREE.Vector3();

        // TODO: Handle 'revolute' and 'prismatic' joints here
        const getAngle = (tg, m1, m2) => {

            // TODO: Why is the constant negated?
            temp.set(0, 0, 0).applyMatrix4(tg.matrixWorld);
            plane.normal.copy(tg.urdf.axis).transformDirection(tg.matrixWorld).normalize();
            plane.constant = -plane.normal.dot(temp);

            // If the camera is looking at the rotation axis at a skewed angle
            temp.set(0, 0, -1).transformDirection(this.camera.matrixWorld);
            if (Math.abs(temp.dot(plane.normal)) < 0.9) {

                temp.copy(plane.normal).multiplyScalar(plane.constant);

                // Just project out from the camera
                raycaster.setFromCamera(m1, this.camera);
                intersect1.copy(raycaster.ray.origin).add(raycaster.ray.direction);
                intersect1.sub(temp);

                raycaster.setFromCamera(m2, this.camera);
                intersect2.copy(raycaster.ray.origin).add(raycaster.ray.direction);
                intersect2.sub(temp);

                temp.crossVectors(intersect2, intersect1);

                return Math.sign(temp.dot(plane.normal)) * intersect2.angleTo(intersect1) * 50;

            } else {

                // Project onto the plane of rotation
                temp.copy(plane.normal).multiplyScalar(plane.constant);

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

                return Math.sign(temp.dot(plane.normal)) * intersect2.angleTo(intersect1) * 5;

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

                let curr = target.object;
                while (curr) {

                    if (curr.urdf && curr.urdf.type && curr.urdf.type !== 'fixed') {

                        dragging = curr;
                        clickPoint.copy(target.point);
                        break;

                    }

                    curr = curr.parent;

                }

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

                hovered.material && hovered.material.color && (hovered.material.color.r = 1);
                hovered = null;
            }

            if (dragging == null && this.disableDragging === false) {

                hovered = getCollisions(mouse).shift() || null;
                if (hovered) {

                    hovered = hovered.object;
                    hovered.material && hovered.material.color && (hovered.material.color.r = 0);

                }

            }

            if (hovered !== wasHovered) {

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

        el.addEventListener('mouseup', e => dragging = null);

    }

}
