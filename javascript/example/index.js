/* globals animToggle viewer THREE */

// declare these globally for the sake of the example.
// Hack to make the build work with webpack for now.
// TODO: Remove this once modules or parcel is being used
viewer = document.querySelector('urdf-viewer');
animToggle = document.getElementById('do-animate');

const limitsToggle = document.getElementById('ignore-joint-limits');
const upSelect = document.getElementById('up-select');
const sliderList = document.querySelector('#controls ul');
const controlsel = document.getElementById('controls');
const controlsToggle = document.getElementById('toggle-controls');
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};

const lerp = (from, to, ratio) => from + (to - from) * ratio;

const updateAngles = () => {

    if (!viewer.setAngle) return;

    // reset everything to 0 first
    const resetangles = viewer.angles;
    for (const name in resetangles) resetangles[name] = 0;
    viewer.setAngles(resetangles);

    // animate the legs
    const time = Date.now() / 3e2;
    for (let i = 1; i <= 6; i++) {

        const offset = i * Math.PI / 3;
        const ratio = Math.max(0, Math.sin(time + offset));

        viewer.setAngle(`HP${ i }`, lerp(30, 0, ratio) * DEG2RAD);
        viewer.setAngle(`KP${ i }`, lerp(90, 150, ratio) * DEG2RAD);
        viewer.setAngle(`AP${ i }`, lerp(-30, -60, ratio) * DEG2RAD);

        viewer.setAngle(`TC${ i }A`, lerp(0, 0.065, ratio));
        viewer.setAngle(`TC${ i }B`, lerp(0, 0.065, ratio));

        viewer.setAngle(`W${ i }`, window.performance.now() * 0.001);

    }

};

const updateLoop = () => {

    if (animToggle.classList.contains('checked')) {
        updateAngles();
    }

    requestAnimationFrame(updateLoop);

};

const setColor = color => {

    document.body.style.backgroundColor = color;
    viewer.highlightColor = '#' + (new THREE.Color(0xffffff)).lerp(new THREE.Color(color), 0.35).getHexString();

};

// toggle checkbox
animToggle.addEventListener('click', () => animToggle.classList.toggle('checked'));

limitsToggle.addEventListener('click', () => {
    limitsToggle.classList.toggle('checked');
    viewer.ignoreLimits = limitsToggle.classList.contains('checked');
});

upSelect.addEventListener('change', () => viewer.up = upSelect.value);

controlsToggle.addEventListener('click', () => controlsel.classList.toggle('hidden'));

// watch for urdf changes
viewer.addEventListener('urdf-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.remove());
    sliders = {};

});

viewer.addEventListener('ignore-limits-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.update());

});

viewer.addEventListener('angle-change', e => {

    if (sliders[e.detail]) sliders[e.detail].update();

});

viewer.addEventListener('joint-mouseover', e => {

    const j = document.querySelector(`li[joint-name="${ e.detail }"]`);
    if (j) {
        j.setAttribute('robot-hovered', true);
        j.scrollIntoView({});
        window.scrollTo(0, 0);
    }
});

viewer.addEventListener('joint-mouseout', e => {

    const j = document.querySelector(`li[joint-name="${ e.detail }"]`);
    if (j) j.removeAttribute('robot-hovered');

});

// create the sliders
viewer.addEventListener('urdf-processed', () => {

    const r = viewer.robot;
    Object
        .keys(r.urdf.joints)
        .sort((a, b) => {

            const da = a.split(/[^\d]+/g).filter(v => !!v).pop();
            const db = b.split(/[^\d]+/g).filter(v => !!v).pop();

            if (da !== undefined && db !== undefined) {
                const delta = parseFloat(da) - parseFloat(db);
                if (delta !== 0) return delta;
            }

            if (a > b) return 1;
            if (b > a) return -1;
            return 0;

        })
        .map(key => r.urdf.joints[key])
        .forEach(joint => {

            const li = document.createElement('li');
            li.innerHTML =
            `
            <span title="${ joint.urdf.name }">${ joint.urdf.name }</span>
            <input type="range" value="0" step="0.0001"/>
            <input type="number" step="0.0001" />
            `;
            li.setAttribute('joint-type', joint.urdf.type);
            li.setAttribute('joint-name', joint.urdf.name);

            sliderList.appendChild(li);

            const slider = li.querySelector('input[type="range"]');
            const input = li.querySelector('input[type="number"]');
            li.update = () => {
                let degVal = joint.urdf.type === 'revolute' ? joint.urdf.angle * RAD2DEG : joint.urdf.angle;
                if (Math.abs(degVal) > 1) degVal = degVal.toFixed(1);
                else degVal = degVal.toPrecision(2);

                input.value = parseFloat(degVal);
                slider.value = joint.urdf.angle;

                if (viewer.ignoreLimits) {
                    slider.min = -6.28;
                    slider.max = 6.28;

                    input.min = -6.28 * RAD2DEG;
                    input.max = 6.28 * RAD2DEG;
                } else {
                    slider.min = joint.urdf.limit.lower;
                    slider.max = joint.urdf.limit.upper;

                    input.min = joint.urdf.limit.lower * RAD2DEG;
                    input.max = joint.urdf.limit.upper * RAD2DEG;
                }
            };

            switch (joint.urdf.type) {

                case 'continuous':
                case 'prismatic':
                case 'revolute':
                    break;
                default:
                    li.update = () => {};
                    input.remove();
                    slider.remove();

            }

            slider.addEventListener('input', () => {
                viewer.setAngle(joint.name, slider.value);
                li.update();
            });

            input.addEventListener('change', () => {
                viewer.setAngle(joint.name, input.value * DEG2RAD);
                li.update();
            });

            li.update();

            sliders[joint.name] = li;

        });

});

document.addEventListener('WebComponentsReady', () => {

    const modelLoader = new THREE.ModelLoader(viewer.loadingManager);
    viewer.urdfLoader.defaultMeshLoader = (path, ext, done) => {
        modelLoader.load(path, res => done(res.model));
    };

    viewer.addEventListener('urdf-processed', e => updateAngles());
    document.querySelector('li[urdf]').dispatchEvent(new Event('click'));

    if (/javascript\/example\/build/i.test(window.location)) {
        viewer.package = '../../../urdf';
    }

    updateLoop();
});
