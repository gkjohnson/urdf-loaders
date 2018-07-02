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

        let candidates = null;
        let dragging = null;

        function toMouseCoord(e, v) {

            v.x = ((e.pageX - el.offsetLeft) / el.offsetWidth) * 2 - 1;
            v.y = -((e.pageY - el.offsetTop) / el.offsetHeight) * 2 + 1;

        }

        el.addEventListener('mousedown', e => {

            toMouseCoord(e, mouse);
            lastMouse.copy(mouse);
            clickedMouse.copy(mouse);

            raycaster.setFromCamera(mouse, this.camera);

            const meshes = [];
            this.robot.traverse(c => c.type === 'Mesh' && meshes.push(c));

            const target = raycaster.intersectObjects(meshes).pop();
            if (target) {

                candidates = [];
                let curr = target.object;
                while (curr) {

                    if (curr.urdf && curr.urdf.type !== 'fixed') {

                        candidates.push(curr);

                    }

                    curr = curr.parent;

                }

            } else {

                candidates = null;

            }

        }, true);
        el.addEventListener('mousemove', e => {

            toMouseCoord(e, mouse);
            delta.copy(mouse).sub(lastMouse);
            clickedDelta.copy(mouse).sub(clickedMouse);

            if (candidates !== null && clickedDelta.length() > 0.01) {

                dragging = candidates.pop();
                candidates = null;

            }

            if (dragging !== null) {

                console.log(dragging);

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
