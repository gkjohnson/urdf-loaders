/* globals URDFViewer THREE */
class URDFManipulator extends URDFViewer {

    constructor(...args) {

        super(...args);

        const el = this.renderer.domElement;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        const lastMouse = new THREE.Vector2();
        const clickedMouse = new THREE.Vector2();
        const delta = new THREE.Vector2();
        const clickedDelta = new THREE.Vector2();
        const plane = new THREE.Plane();
        const line = new THREE.Line3();

        let candidates = null;
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
        const getAngle = (tg, m1, m2) => {

            // TODO: Why is the constant negated?
            temp.set(0, 0, 0).applyMatrix4(tg.matrixWorld);
            plane.normal.copy(tg.urdf.axis).transformDirection(tg.matrixWorld).normalize();
            plane.constant = -plane.normal.dot(temp);

            raycaster.setFromCamera(m1, this.camera);
            line.start.copy(raycaster.ray.origin);
            line.end.copy(raycaster.ray.origin).add(raycaster.ray.direction.normalize().multiplyScalar(1e5));
            plane.intersectLine(line, intersect1);

            raycaster.setFromCamera(m2, this.camera);
            line.start.copy(raycaster.ray.origin);
            line.end.copy(raycaster.ray.origin).add(raycaster.ray.direction.normalize().multiplyScalar(1e5));
            plane.intersectLine(line, intersect2);

            intersect1.sub(temp);
            intersect2.sub(temp);

            temp.crossVectors(intersect2, intersect1);

            return Math.sign(temp.dot(plane.normal)) * intersect2.angleTo(intersect1);

        };

        el.addEventListener('mousedown', e => {

            toMouseCoord(e, mouse);
            lastMouse.copy(mouse);
            clickedMouse.copy(mouse);

            const target = getCollisions(mouse).shift();
            if (target) {

                candidates = [];
                let curr = target.object;
                while (curr) {

                    if (curr.urdf && curr.urdf.type && curr.urdf.type !== 'fixed') {

                        candidates.push(curr);

                    }

                    curr = curr.parent;

                }

                if (candidates.length === 0) {

                    candidates = null;

                }

            } else {

                candidates = null;

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

                hovered.material.color.r = 1;
                hovered = null;
            }

            if (dragging == null) {

                hovered = getCollisions(mouse).shift() || null;
                if (hovered) {

                    hovered = hovered.object;
                    hovered.material.color.r = 0;

                }

            }

            if (hovered !== wasHovered) this.redraw();

            if (candidates !== null && clickedDelta.length() > 0.1) {

                dragging = candidates.shift();
                lastMouse.copy(clickedMouse);
                candidates = null;

            }

            if (dragging !== null) {

                dragging.urdf.setAngle(dragging.urdf.angle + getAngle(dragging, mouse, lastMouse));

                this.redraw();

            }

            if (candidates !== null || dragging !== null) {

                e.stopPropagation();
                e.preventDefault();

            }

            lastMouse.copy(mouse);

            return false;

        }, true);
        el.addEventListener('mouseup', e => {

            dragging = null;

        });

    }

}
