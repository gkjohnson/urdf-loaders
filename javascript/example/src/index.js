/* globals */
import * as THREE from 'three';
import { registerDragEvents } from './dragAndDrop.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import URDFManipulator from '../../src/urdf-manipulator-element.js';

customElements.define('urdf-viewer', URDFManipulator);

// declare these globally for the sake of the example.
// Hack to make the build work with webpack for now.
// TODO: Remove this once modules or parcel is being used
const viewer = document.querySelector('urdf-viewer');

const limitsToggle = document.getElementById('ignore-joint-limits');
const collisionToggle = document.getElementById('collision-toggle');
const radiansToggle = document.getElementById('radians-toggle');
const autocenterToggle = document.getElementById('autocenter-toggle');
const upSelect = document.getElementById('up-select');
const sliderList = document.querySelector('#controls ul');
const controlsel = document.getElementById('controls');
const controlsToggle = document.getElementById('toggle-controls');
const animToggle = document.getElementById('do-animate');
const hideFixedToggle = document.getElementById('hide-fixed');
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};
let lastSelectedJoint = null;
let urdfDoc;

// Global Functions
const setColor = color => {

    document.body.style.backgroundColor = color;
    viewer.highlightColor = '#' + (new THREE.Color(0xffffff)).lerp(new THREE.Color(color), 0.35).getHexString();

};
window.setColor = color => {
    document.body.style.backgroundColor = color;
    viewer.highlightColor = '#' + (new THREE.Color(0xffffff)).lerp(new THREE.Color(color), 0.35).getHexString();
};
// Events
// toggle checkbox
limitsToggle.addEventListener('click', () => {
    limitsToggle.classList.toggle('checked');
    viewer.ignoreLimits = limitsToggle.classList.contains('checked');
});

radiansToggle.addEventListener('click', () => {
    radiansToggle.classList.toggle('checked');
    Object
        .values(sliders)
        .forEach(sl => sl.update());
});

collisionToggle.addEventListener('click', () => {
    collisionToggle.classList.toggle('checked');
    viewer.showCollision = collisionToggle.classList.contains('checked');
});

autocenterToggle.addEventListener('click', () => {
    autocenterToggle.classList.toggle('checked');
    viewer.noAutoRecenter = !autocenterToggle.classList.contains('checked');
});

hideFixedToggle.addEventListener('click', () => {
    hideFixedToggle.classList.toggle('checked');

    const hideFixed = hideFixedToggle.classList.contains('checked');
    if (hideFixed) controlsel.classList.add('hide-fixed');
    else controlsel.classList.remove('hide-fixed');

});

upSelect.addEventListener('change', () => viewer.up = upSelect.value);

controlsToggle.addEventListener('click', () => controlsel.classList.toggle('hidden'));

// watch for urdf changes
viewer.addEventListener('urdf-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.remove());
    sliders = {};

    // Repopulate joint and link names
    populateJointNames();
    populateLinkNames();
    editURDF();

    // Increment the URDF change counter
    urdfChangeCounter++;
    console.log('URDF LOADS:', urdfChangeCounter);
});

viewer.addEventListener('ignore-limits-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.update());

});

viewer.addEventListener('angle-change', e => {

    if (sliders[e.detail]) sliders[e.detail].update();

});
// Function to edit the current URDF
function editURDF(urdfContent) {
    populateJointNames();
    populateLinkNames();

    console.log(viewer.urdf);
    // Check if content is provided, if not, fetch using viewer's current URDF setting
    if (!urdfContent && viewer.urdf) {
        fetch(viewer.urdf)
            .then(response => response.text())
            .then(data => {
                document.getElementById('urdf-editor').value = data;
                urdfDoc = new DOMParser().parseFromString(data, "text/xml");
            })
            .catch(error => console.error('Error loading URDF:', error));
    } else if (urdfContent) {
        document.getElementById('urdf-editor').value = urdfContent;
        urdfDoc = new DOMParser().parseFromString(urdfContent, "text/xml");
    }
}
viewer.addEventListener('joint-mouseover', e => {
    const jointName = e.detail; // Assuming `e.detail` contains the name of the hovered joint
    const jointSelector = document.getElementById('joint-selector');
    const linkSelector = document.getElementById('link-selector');
    const jointOption = document.querySelector(`#joint-selector option[value="${jointName}"]`);
    const j = document.querySelector(`li[joint-name="${jointName}"]`);
    const linkChild = viewer.robot.joints[jointName].children[0];
    const linkName = linkChild.name;
    // console.log(linkChild.name);
    if (j) {
        j.setAttribute('robot-hovered', true);
    }

    if (lastSelectedJoint && lastSelectedJoint !== jointName) {
        setTransparency(lastSelectedJoint, false); // Revert the last selected joint to opaque
    }

    setTransparency(jointName, true); // Make the current joint transparent
    lastSelectedJoint = jointName; // Update the last selected joint

    // Check if the option exists in the select dropdown, if not, create and append it
    if (!jointOption) {
        const newOption = document.createElement('option');
        newOption.value = jointName;
        newOption.textContent = jointName;
        jointSelector.appendChild(newOption);
    }

    // Set the select element's value to the hovered joint name
    jointSelector.value = jointName;
    linkSelector.value = linkName;

});

viewer.addEventListener('joint-mouseout', e => {

    const j = document.querySelector(`li[joint-name="${e.detail}"]`);
    if (j) j.removeAttribute('robot-hovered');

});

let originalNoAutoRecenter;
viewer.addEventListener('manipulate-start', e => {
    const jointName = e.detail; // e.detail should contain the name of the joint being manipulated
    if (lastSelectedJoint && lastSelectedJoint !== jointName) {
        setTransparency(lastSelectedJoint, false); // Revert the last selected joint to opaque
    }
    setTransparency(jointName, true); // Make the current joint transparent
    lastSelectedJoint = jointName; // Update the last selected joint

    const j = document.querySelector(`li[joint-name="${jointName}"]`);
    if (j) {
        j.scrollIntoView({ block: 'nearest' });
        window.scrollTo(0, 0);
    }
    originalNoAutoRecenter = viewer.noAutoRecenter;
    viewer.noAutoRecenter = true;
});

viewer.addEventListener('manipulate-end', () => {

    viewer.noAutoRecenter = originalNoAutoRecenter;

});

// create the sliders
viewer.addEventListener('urdf-processed', () => {

    const r = viewer.robot;
    Object
        .keys(r.joints)
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
        .map(key => r.joints[key])
        .forEach(joint => {

            const li = document.createElement('li');
            li.innerHTML =
                `
            <span title="${joint.name}">${joint.name}</span>
            <input type="range" value="0" step="0.0001"/>
            <input type="number" step="0.0001" />
            <input type="text" placeholder="${joint.mimicJoint}" />
            `;

            li.setAttribute('joint-type', joint.jointType);
            li.setAttribute('joint-name', joint.name);

            sliderList.appendChild(li);

            // update the joint display
            const slider = li.querySelector('input[type="range"]');
            const input = li.querySelector('input[type="number"]');
            const listener = li.querySelector('input[type="text"]');
            li.update = () => {
                const degMultiplier = radiansToggle.classList.contains('checked') ? 1.0 : RAD2DEG;
                let angle = joint.angle;

                if (joint.jointType === 'revolute' || joint.jointType === 'continuous') {
                    angle *= degMultiplier;
                }
                if (joint.jointType === 'mimic') {
                    listener.ariaPlaceholder = joint.mimicJoint;
                }
                /*
                if (Math.abs(angle) > 1) {
                    angle.value.toFixed(1);
                } else {
                    angle.value.toFixed(2);
                }
*/
                input.value = parseFloat(angle);

                // directly input the value
                slider.value = joint.angle;

                if (viewer.ignoreLimits || joint.jointType === 'continuous') {
                    slider.min = -6.28;
                    slider.max = 6.28;

                    input.min = -6.28 * degMultiplier;
                    input.max = 6.28 * degMultiplier;
                } else {
                    slider.min = joint.limit.lower;
                    slider.max = joint.limit.upper;

                    input.min = joint.limit.lower * degMultiplier;
                    input.max = joint.limit.upper * degMultiplier;
                }
            };

            switch (joint.jointType) {

                case 'continuous':
                case 'fixed':
                    listener.remove();
                    input.remove();
                    slider.remove();
                    break;
                case 'mimic':
                    li.update = () => { };
                    input.remove();
                    slider.remove();
                    break;
                case 'prismatic':
                case 'revolute':
                    listener.remove();
                    break;
                default:
                    li.update = () => { };
                    input.remove();
                    slider.remove();

            }

            slider.addEventListener('input', () => {
                viewer.setJointValue(joint.name, slider.value);
                li.update();
            });

            input.addEventListener('change', () => {
                const degMultiplier = radiansToggle.classList.contains('checked') ? 1.0 : DEG2RAD;
                viewer.setJointValue(joint.name, input.value * degMultiplier);
                li.update();
            });

            li.update();

            sliders[joint.name] = li;

        });

});

document.addEventListener('WebComponentsReady', () => {
    const urdfOptions = document.getElementById('urdf-options');

    viewer.loadMeshFunc = (path, manager, done) => {

        const ext = path.split(/\./g).pop().toLowerCase();
        switch (ext) {

            case 'gltf':
            case 'glb':
                new GLTFLoader(manager).load(
                    path,
                    result => done(result.scene),
                    null,
                    err => done(null, err),
                );
                break;
            case 'obj':
                new OBJLoader(manager).load(
                    path,
                    result => done(result),
                    null,
                    err => done(null, err),
                );
                break;
            case 'dae':
                new ColladaLoader(manager).load(
                    path,
                    result => done(result.scene),
                    null,
                    err => done(null, err),
                );
                break;
            case 'stl':
                new STLLoader(manager).load(
                    path,
                    result => {
                        const material = new THREE.MeshPhongMaterial();
                        const mesh = new THREE.Mesh(result, material);
                        done(mesh);
                    },
                    null,
                    err => done(null, err),
                );
                break;

        }

    };
    urdfOptions.addEventListener('click', (event) => {
        if (event.target.tagName.toLowerCase() === 'li' && event.target.hasAttribute('urdf')) {
            const urdf = event.target.getAttribute('urdf');
            const up = event.target.getAttribute('up') || '';
            viewer.urdf = urdf;
            viewer.up = up;

            // Apply the selected color or any other necessary changes
            const color = event.target.getAttribute('color');
            setColor(color);

            // Any other necessary updates
            updateList();
        }
    });

    document.querySelector('li[urdf]').dispatchEvent(new Event('click'));

    if (/javascript\/example\/bundle/i.test(window.location)) {
        viewer.package = '../../../urdf';
        viewer.up = '';
    }

    registerDragEvents(viewer, () => {
        setColor('#263238');
        animToggle.classList.remove('checked');
        updateList();
    });

});

// init 2D UI and animation
const updateAngles = () => {

    if (!viewer.setJointValue) return;

    // reset everything to 0 first
    const resetJointValues = viewer.angles;
    for (const name in resetJointValues) resetJointValues[name] = 0;
    viewer.setJointValues(resetJointValues);

    // animate the legs
    const time = Date.now() / 3e2;
    for (let i = 1; i <= 6; i++) {

        const offset = i * Math.PI / 3;
        const ratio = Math.max(0, Math.sin(time + offset));

        viewer.setJointValue(`HP${i}`, THREE.MathUtils.lerp(30, 0, ratio) * DEG2RAD);
        viewer.setJointValue(`KP${i}`, THREE.MathUtils.lerp(90, 150, ratio) * DEG2RAD);
        viewer.setJointValue(`AP${i}`, THREE.MathUtils.lerp(-30, -60, ratio) * DEG2RAD);

        viewer.setJointValue(`TC${i}A`, THREE.MathUtils.lerp(0, 0.065, ratio));
        viewer.setJointValue(`TC${i}B`, THREE.MathUtils.lerp(0, 0.065, ratio));

        viewer.setJointValue(`W${i}`, window.performance.now() * 0.001);

    }

};

const updateLoop = () => {

    if (animToggle.classList.contains('checked')) {
        updateAngles();
    }

    requestAnimationFrame(updateLoop);

};

const updateList = () => {

    document.querySelectorAll('#urdf-options li[urdf]').forEach(el => {

        el.addEventListener('click', e => {

            const urdf = e.target.getAttribute('urdf');
            const color = e.target.getAttribute('color');

            viewer.up = document.getElementById('up-select').value;
            viewer.urdf = urdf;
            animToggle.classList.add('checked');
            setColor(color);

        });

    });

};
function setTransparency(jointName, isTransparent) {
    const joint = viewer.robot.joints[jointName];
    if (joint) {
        joint.traverse(child => {
            if (child instanceof THREE.Mesh) {
                child.material.transparent = true;
                child.material.opacity = isTransparent ? 0.5 : 1.0; // Set to 50% transparency or fully opaque
            }
        });
    }
}

updateList();

document.addEventListener('WebComponentsReady', () => {

    animToggle.addEventListener('click', () => animToggle.classList.toggle('checked'));

    // stop the animation if user tried to manipulate the model
    viewer.addEventListener('manipulate-start', () => animToggle.classList.remove('checked'));
    viewer.addEventListener('urdf-processed', () => updateAngles());
    updateLoop();
    viewer.camera.position.set(-5.5, 3.5, 5.5);

});

function updateJointProperties() {

    const jointName = document.getElementById('joint-selection-save').value;
    const originXYZ = document.getElementById('joint-origin-xyz').value.split(' ').map(Number);
    const originRPYElement = document.getElementById('joint-origin-rpy');

    // console.log(originRPYElement);

    const originRPY = originRPYElement.getAttribute('data-unit') === '°'
        ? originRPYElement.value.split(' ').map(v => parseFloat(v))
        : originRPYElement.value.split(' ').map(Number);

    const convertedRPY = originRPY.map(value => value * (Math.PI / 180));

    // console.log('Converted J : ', convertedRPY)

    const positionXYZ = document.getElementById('joint-position-xyz').value.split(' ').map(Number);
    const axisXYZ = document.getElementById('joint-axis-xyz').value.split(' ').map(Number);
    const lowerLimit = parseFloat(document.getElementById('joint-lower-limit').value) * Math.PI / 180;
    const upperLimit = parseFloat(document.getElementById('joint-upper-limit').value) * Math.PI / 180;

    if (viewer && viewer.robot && viewer.robot.joints[jointName]) {
        const joint = viewer.robot.joints[jointName];

        const quaternion = new THREE.Quaternion();
        const euler = new THREE.Euler(...convertedRPY, 'XYZ');
        quaternion.setFromEuler(euler);

        joint.origPosition.set(originXYZ[0], originXYZ[1], originXYZ[2]);
        joint.origQuaternion = quaternion;
        joint.axis = new THREE.Vector3(...axisXYZ);
        joint.limit = { lower: lowerLimit, upper: upperLimit };
        joint.position.set(positionXYZ[0], positionXYZ[1], positionXYZ[2]);

        // console.log('Joint Quat: ', joint.origQuaternion);

        refreshScene();
    } else {
        console.error('Joint not found or viewer not initialized properly.');
    }
}

function updateLinkVisualProperties() {
    const linkName = document.getElementById('link-selection-save').value;

    const link = viewer.robot.links[linkName];
    const visualIndex = link.children.findIndex(child => child.name === 'URDFVisual');
    // console.log(visualIndex);
    const visualOriginXYZ = document.getElementById('visual-origin-xyz').value.split(' ').map(Number);

    const visualOriginRPYElement = document.getElementById('visual-origin-rpy');

    const visualOriginRPY = visualOriginRPYElement.getAttribute('data-unit') === '°'
        ? visualOriginRPYElement.value.split(' ').map(v => parseFloat(v))
        : visualOriginRPYElement.value.split(' ').map(Number);

    const visualConvertedRPY = visualOriginRPY.map(value => value * (Math.PI / 180));
    console.log(visualConvertedRPY);

    console.log('Converted L : ', visualConvertedRPY);

    if (viewer && viewer.robot && viewer.robot.links[linkName].children[visualIndex]) {
        const linkWrite = viewer.robot.links[linkName].children[visualIndex];
        console.log('Link Pre Write : ', linkWrite);

        const linkQuaternion = new THREE.Quaternion();
        const linkEuler = new THREE.Euler(...visualConvertedRPY, 'XYZ');

        linkQuaternion.setFromEuler(linkEuler);

        console.log('Quaternion To X : ', linkQuaternion._x);
        console.log('Quaternion To Y : ', linkQuaternion._y);
        console.log('Quaternion To Z : ', linkQuaternion._z);
        console.log('Quaternion To W : ', linkQuaternion._w);

        linkWrite.position.set(visualOriginXYZ[0], visualOriginXYZ[1], visualOriginXYZ[2]);
        linkWrite.quaternion._x = linkQuaternion._x;
        linkWrite.quaternion._y = linkQuaternion._y;
        linkWrite.quaternion._z = linkQuaternion._z;
        linkWrite.quaternion._w = linkQuaternion._w;

        console.log('Link Quaternion X : ', linkWrite.quaternion._x);
        console.log('Link Quaternion Y : ', linkWrite.quaternion._y);
        console.log('Link Quaternion Z : ', linkWrite.quaternion._z);
        console.log('Link Quaternion W : ', linkWrite.quaternion._w);

        refreshScene();
    } else {
        console.error('Link not found in the URDF:', linkName);
    }
}

function refreshScene() {
    viewer.redraw();
}

function dynamicPrecision(value) {
    if (value === 0) return 0;
    const absValue = Math.abs(value);
    if (absValue < 0.0001) return 4;
    if (absValue < 0.001) return 3;
    if (absValue < 0.01) return 2;
    if (absValue < 0.1) return 2;
    return 1;
}

function loadLinkDetails() {
    const linkSelector = document.getElementById('link-selector');
    const linkName = linkSelector.value;
    const link = viewer.robot.links[linkName];
    // console.log(link.children);
    const linkValues = link.children[0];

    if (viewer && viewer.robot && viewer.robot.links[linkName]) {
        document.getElementById('link-selection-save').value = linkName;
    }

    // console.log(link);

    if (linkValues.quaternion) {
        const euler = new THREE.Euler().setFromQuaternion(linkValues.quaternion, 'XYZ');

        const rpy = [euler.x, euler.y, euler.z].map(r => {
            const degrees = r * 180 / Math.PI;
            return degrees.toFixed(dynamicPrecision(degrees));
        });

        document.getElementById('visual-origin-rpy').value = rpy.join(' ');
    }
    if (linkValues.position) {
        document.getElementById('visual-origin-xyz').value = linkValues.position.toArray().join(' ');
    } else {
        console.error('Quaternion is undefined for the link:', linkName);
    }
}

function loadJointDetails() {
    const jointSelector = document.getElementById('joint-selector');
    const jointName = jointSelector.value;

    if (viewer && viewer.robot && viewer.robot.joints[jointName]) {
        const joint = viewer.robot.joints[jointName];

        if (joint.origQuaternion) {
            // console.log(joint.origQuaternion);

            if (joint.origQuaternion) {

                const euler = new THREE.Euler().setFromQuaternion(joint.origQuaternion, 'XYZ');
                // console.log(joint.origQuaternion);

                const rpy = [euler.x, euler.y, euler.z].map(r => {
                    const degrees = r * 180 / Math.PI;
                    return degrees.toFixed(dynamicPrecision(degrees));
                });
                // console.log(rpy);

                document.getElementById('joint-selection-save').value = jointName;
                document.getElementById('joint-origin-xyz').value = joint.origPosition.toArray().join(' ');
                document.getElementById('joint-origin-rpy').value = rpy.join(' ');
                document.getElementById('joint-position-xyz').value = joint.position.toArray().join(' ');
                document.getElementById('joint-axis-xyz').value = [joint.axis.x, joint.axis.y, joint.axis.z].map(x => x.toFixed(dynamicPrecision(x))).join(' ');
                document.getElementById('joint-lower-limit').value = (joint.limit.lower * 180 / Math.PI).toFixed(dynamicPrecision(joint.limit.lower * 180 / Math.PI));
                document.getElementById('joint-upper-limit').value = (joint.limit.upper * 180 / Math.PI).toFixed(dynamicPrecision(joint.limit.upper * 180 / Math.PI));
            } else {
                console.error('Invalid Quaternion object for the joint:', jointName);
            }
        } else {
            console.error('Quaternion is undefined for the joint:', jointName);
        }
    } else {
        console.error('Joint not found or viewer not initialized properly.');
    }
}
function populateJointNames() {
    const jointSelector = document.getElementById('joint-selector');
    if (viewer && viewer.robot) {
        // Clear existing options
        jointSelector.innerHTML = '';

        Object.keys(viewer.robot.joints).forEach(jointName => {
            const option = document.createElement('option');
            option.value = jointName;
            option.textContent = jointName;
            jointSelector.appendChild(option);
        });
    }
}

function populateLinkNames() {
    const linkSelector = document.getElementById('link-selector');
    if (viewer && viewer.robot) {
        // Clear existing options
        linkSelector.innerHTML = '';

        Object.keys(viewer.robot.links).forEach(linkName => {
            const option = document.createElement('option');
            option.value = linkName;
            option.textContent = linkName;
            linkSelector.appendChild(option);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        populateJointNames();
        populateLinkNames();
        document.getElementById('link-selector').addEventListener('change', function () {
            loadLinkDetails();
        });
        document.getElementById('joint-selector').addEventListener('change', function () {
            loadJointDetails();
        });
        if (viewer) {
            viewer.addEventListener('manipulate-start', function (e) {
                const jointName = e.detail;
                const jointSelector = document.getElementById('joint-selector');
                jointSelector.value = jointName;
                loadJointDetails();
                loadLinkDetails();
            });
        }
    }, 2000);
});

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        populateJointNames();
        populateLinkNames();
        document.getElementById('link-selector').addEventListener('change', function () {
            loadLinkDetails();
        });
        document.getElementById('joint-selector').addEventListener('change', function () {
            loadJointDetails();
        });
        if (viewer) {
            viewer.addEventListener('manipulate-start', function (e) {
                const jointName = e.detail;
                const jointSelector = document.getElementById('joint-selector');
                jointSelector.value = jointName;
                loadJointDetails();
                loadLinkDetails();
            });
        }
    }, 2000);
});

document.addEventListener('DOMContentLoaded', function () {
    var dragHandle = document.getElementById('dragHandle');
    var sliderSection = document.getElementById('main-stack');

    var drag = false;
    var sliding = false;
    var offsetX, offsetY;

    sliderSection.addEventListener('mousedown', function () {
        sliding = true;

    });

    sliderSection.addEventListener('mouseup', function () {
        sliding = false;

    });

    dragHandle.addEventListener('mousedown', function (e) {

        drag = true;
        offsetX = dragHandle.offsetLeft - e.clientX;
        offsetY = dragHandle.offsetTop - e.clientY;
        this.style.cursor = 'grabbing';
    });

    document.addEventListener('mouseup', function () {
        drag = false;
        dragHandle.style.cursor = 'grab';
    });

    document.addEventListener('mousemove', function (e) {
        if (drag && !sliding) {
            dragHandle.style.left = e.clientX + offsetX + 'px';
            dragHandle.style.top = e.clientY + offsetY + 'px';
        }
    });
});
document.addEventListener('DOMContentLoaded', function () {
    var consoleElement = document.getElementById('dragHandle');
    var scaleIndicator = document.getElementById('window-scale');
    var currentScale = 1; // Start with no scale

    document.getElementById('windowplus').addEventListener('mousedown', function () {
        currentScale *= 1.02; // Increase scale by 2%
        applyScale();
        triggerAnimation();
    });

    document.getElementById('windowminus').addEventListener('mousedown', function () {
        currentScale *= 0.98; // Decrease scale by 2%
        applyScale();
        triggerAnimation();
    });

    function applyScale() {
        consoleElement.style.transform = `scale(${currentScale})`;
        scaleIndicator.setAttribute('data-scale', `${(currentScale * 100).toFixed(2)}%`);
    }

    function triggerAnimation() {
        scaleIndicator.classList.add('animate-scale');
        // Remove the class after the animation completes
        setTimeout(() => {
            scaleIndicator.classList.remove('animate-scale');
        }, 500); // Match the animation duration
    }
});
// Ensure this function is available globally if needed elsewhere
window.editURDF = editURDF;

async function fileExists(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}
function applyURDF() {
    const updatedURDFText = document.getElementById('urdf-editor').value; // Get URDF string from textarea
    if (viewer && updatedURDFText) {
        // Parse the new URDF text to a DOM object
        const parser = new DOMParser();
        const urdfDOM = parser.parseFromString(updatedURDFText, 'text/xml');

        // Adjust mesh URLs in the URDF DOM
        const meshElements = urdfDOM.querySelectorAll('[filename]');
        meshElements.forEach(async element => {
            const originalPath = element.getAttribute('filename');
            let correctedPath = originalPath;
            console.log('Original: ', originalPath);

            const urltest = viewer.urdf; // Assuming 'viewer.urdf' is a property that can be set to change the URDF
            console.log(urltest);

            if (originalPath.startsWith('../meshes/')) {
                // Adjust the path to point to the correct location
                correctedPath = `${viewer.urdf.substring(5)}../../urdf/meshes/${originalPath.substring(10)}`;
                console.log('Corrected: ', correctedPath);

                // Check if the corrected path exists
                const exists = await fileExists(`/${correctedPath}`);

                // If the file does not exist at the corrected path, revert to original path
                if (!exists) {
                    correctedPath = originalPath;
                }
            }
            element.setAttribute('filename', correctedPath);
        });

        // Serialize the DOM back to a string
        const serializer = new XMLSerializer();
        const modifiedURDFString = serializer.serializeToString(urdfDOM);

        console.log(urdfDOM);

        // Convert modified URDF string to a Blob and set it as the new URDF on the viewer
        const blob = new Blob([modifiedURDFString], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);

        viewer.urdf = url; // Assuming 'viewer.urdf' is a property that can be set to change the URDF

        // Increment the URDF change counter
        //urdfChangeCounter++;
        //console.log('URDF has been changed', urdfChangeCounter, 'times');
    }
}


function updateURDF() {
        const jointName = document.getElementById('joint-selection-save').value;
        const originXYZ = document.getElementById('joint-origin-xyz').value;
        const originRPYElement = document.getElementById('joint-origin-rpy');

        const originRPY = originRPYElement.value.split(' ').map(v => parseFloat(v) * Math.PI / 180);
        const axisXYZ = document.getElementById('joint-axis-xyz').value;
        const lowerLimit = parseFloat(document.getElementById('joint-lower-limit').value) * Math.PI / 180;
        const upperLimit = parseFloat(document.getElementById('joint-upper-limit').value) * Math.PI / 180;

        const joint = urdfDoc.querySelector(`joint[name="${jointName}"]`);

        if (!joint) {
            console.error('Joint not found in the URDF:', jointName);
            return;
        }

        //let origin = joint.querySelector('origin');
        if (!origin) {
            origin = urdfDoc.createElement('origin');
            joint.appendChild(origin);
        }

        let axis = joint.querySelector('axis');
        if (!axis) {
            axis = urdfDoc.createElement('axis');
            joint.appendChild(axis);
        }

        let limit = joint.querySelector('limit');
        if (!limit) {
            limit = urdfDoc.createElement('limit');
            joint.appendChild(limit);
        }

        origin.setAttribute('xyz', originXYZ);
        origin.setAttribute('rpy', originRPY.join(' '));
        axis.setAttribute('xyz', axisXYZ);
        limit.setAttribute('lower', lowerLimit);
        limit.setAttribute('upper', upperLimit);

        //const serializer = new XMLSerializer();
        //const updatedURDF = serializer.serializeToString(urdfDoc);
        //document.getElementById('urdf-editor').value = updatedURDF;

        const linkName = document.getElementById('link-selection-save').value;
        const visualOriginXYZ = document.getElementById('visual-origin-xyz').value;
        const visualOriginRPYElement = document.getElementById('visual-origin-rpy');
        const visualOriginRPY = visualOriginRPYElement.value.split(' ').map(v => parseFloat(v) * Math.PI / 180);
        const linkUrdf = urdfDoc.querySelector(`link[name="${linkName}"]`);

        if (!linkUrdf) {
            console.error('Link not found in the URDF:', linkName);
            return;
        }

        const visual = linkUrdf.querySelector('visual');
        let origin = visual.querySelector('origin');

        if (!origin) {
            origin = urdfDoc.createElement('origin');
            linkUrdf.appendChild(origin);
        }

        origin.setAttribute('xyz', visualOriginXYZ);
        origin.setAttribute('rpy', visualOriginRPY.join(' '));
        console.log(visualOriginRPY);

        const serializer = new XMLSerializer();
        const updatedURDF = serializer.serializeToString(urdfDoc);
        document.getElementById('urdf-editor').value = updatedURDF;
}

// Function to save the modified URDF content as a local file
function saveURDF(event) {
    event.preventDefault();

    const updatedURDFText = document.getElementById('urdf-editor').value; // Get URDF string from textarea
    if (viewer && updatedURDFText) {
        // Parse the new URDF text to a DOM object
        const parser = new DOMParser();
        const urdfDOM = parser.parseFromString(updatedURDFText, 'text/xml');

        // Adjust mesh URLs in the URDF DOM
        const meshElements = urdfDOM.querySelectorAll('[filename]');
        meshElements.forEach(async element => {
            const originalPath = element.getAttribute('filename');
            let correctedPath = originalPath;
            console.log('Original: ', originalPath);

            if (originalPath.startsWith('../meshes/')) {
                // Adjust the path to point to the correct location
                correctedPath = `../urdf/dropbear/meshes/${originalPath.substring(10)}`;
                console.log('Corrected: ', correctedPath);

                // Check if the corrected path exists
                const exists = await fileExists(`/${correctedPath}`);

                // If the file does not exist at the corrected path, revert to original path
                if (!exists) {
                    correctedPath = originalPath;
                }
            }
            element.setAttribute('filename', correctedPath);
        });

        // Serialize the DOM back to a string
        const serializer = new XMLSerializer();
        const modifiedURDFString = serializer.serializeToString(urdfDOM);

        // Convert modified URDF string to a Blob and set it as the new URDF on the viewer
        const blob = new Blob([modifiedURDFString], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);

        // Create a download link and trigger the download
        const a = document.createElement('a');
        a.href = url;
        const downloadName = `${viewer.robot.robotName}.urdf`;
        a.download = downloadName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// Function to initialize event listeners once the document is ready
document.addEventListener('DOMContentLoaded', () => {
    // document.getElementById('edit-urdf-btn').addEventListener('click', editURDF);
    document.getElementById('save-urdf-btn').addEventListener('click', saveURDF);
    document.getElementById('update-urdf-link-btn').addEventListener('click', updateURDF);
    document.getElementById('update-link-props-btn').addEventListener('click', updateLinkVisualProperties);
    document.getElementById('update-joint-props-btn').addEventListener('click', updateJointProperties);
    document.getElementById('update-urdf-joint-btn').addEventListener('click', updateURDF);
    document.getElementById('apply-urdf-btn').addEventListener('click', applyURDF);
    document.getElementById('reload-btn').addEventListener('click', refreshScene);
    setTimeout(() => {
        populateJointNames();
        populateLinkNames();

        document.getElementById('link-selector').addEventListener('change', loadLinkDetails);
        document.getElementById('joint-selector').addEventListener('change', loadJointDetails);

        if (viewer) {
            viewer.addEventListener('manipulate-start', function (e) {
                const jointName = e.detail; // Assuming the event detail contains the joint name
                const jointSelector = document.getElementById('joint-selector');
                jointSelector.value = jointName;
                loadJointDetails(); // Load the details of the clicked joint into the input fields
            });
        }
    }, 2000); // Ensure URDF data is loaded and delay to setup the event listener
});
