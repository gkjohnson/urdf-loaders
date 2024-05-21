/* globals viewer THREE */

// Declare globally for the sake of the example.
viewer = document.querySelector('urdf-viewer');

const limitsToggle = document.getElementById('ignore-joint-limits');
const upSelect = document.getElementById('up-select');
const sliderList = document.querySelector('#controls ul');
const controlsel = document.getElementById('controls');
const controlsToggle = document.getElementById('toggle-controls');
const debugToggle = document.getElementById('toggle-debug');
const applyURDFBtn = document.getElementById('apply-urdf-btn'); // Button to apply URDF updates
var DEG2RAD = Math.PI / 180;
const RAD2DEG = 1 / DEG2RAD;
let sliders = {};



// Global Functions
window.setColor = color => {
    document.body.style.backgroundColor = color;
    viewer.highlightColor = '#' + (new THREE.Color(0xffffff)).lerp(new THREE.Color(color), 0.35).getHexString();
};

// Function to apply the updated URDF XML to the viewer
function applyURDF() {
    const updatedURDF = document.getElementById('urdf-editor').value; // Assume 'urdf-editor' is your textarea ID
    if (viewer && updatedURDF) {
        viewer.setURDF(updatedURDF); // Assuming there's a method to directly set URDF
        viewer.dispatchEvent(new Event('urdf-change'));
    }
}

// Events
limitsToggle.addEventListener('click', () => {
    limitsToggle.classList.toggle('checked');
    viewer.ignoreLimits = limitsToggle.classList.contains('checked');
});

upSelect.addEventListener('change', () => viewer.up = upSelect.value);

controlsToggle.addEventListener('click', () => controlsel.classList.toggle('hidden'));

viewer.addEventListener('urdf-change', () => {
    Object.values(sliders).forEach(sl => sl.remove());
    sliders = {};
});

viewer.addEventListener('ignore-limits-change', () => {
    Object.values(sliders).forEach(sl => sl.update());
});

viewer.addEventListener('angle-change', e => {
    if (sliders[e.detail]) sliders[e.detail].update();
});

let lastSelectedJoint = null;

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

viewer.addEventListener('joint-mouseover', e => {
    const jointName = e.detail; // Assuming `e.detail` contains the name of the hovered joint
    const jointSelector = document.getElementById('joint-selector');
    const linkSelector = document.getElementById('link-selector');
    const jointOption = document.querySelector(`#joint-selector option[value="${jointName}"]`);
    const j = document.querySelector(`li[joint-name="${jointName}"]`);
    const linkChild = viewer.robot.joints[jointName].children[0];
    const meshIndex = linkChild.children.findIndex(child => child instanceof THREE.Mesh);
    const linkValues = linkChild.children[meshIndex];
    const linkName = linkChild.name;
    //console.log(linkChild.name);
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
        let newOption = document.createElement("option");
        newOption.value = jointName;
        newOption.textContent = jointName;
        jointSelector.appendChild(newOption);
    }

    // Set the select element's value to the hovered joint name
    jointSelector.value = jointName;
    linkSelector.value = linkName;

});

viewer.addEventListener('joint-mouseout', e => {
    //const jointName = e.detail;
    const j = document.querySelector(`li[joint-name="${e.detail}"]`);
    //setTransparency(jointName, false); // Revert to opaque when the mouse leaves
    if (j) j.removeAttribute('robot-hovered');
});


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

viewer.addEventListener('manipulate-end', e => {
    viewer.noAutoRecenter = originalNoAutoRecenter;
});


viewer.addEventListener('urdf-processed', () => {
    const r = viewer.robot;
    Object.keys(r.joints).sort((a, b) => {
        const da = a.split(/[^\d]+/g).filter(v => !!v).pop();
        const db = b.split(/[^\d]+/g).filter(v => !!v).pop();
        return da && db ? parseFloat(da) - parseFloat(db) : a.localeCompare(b);
    }).map(key => r.joints[key]).forEach(joint => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span title="${joint.name}">${joint.name}</span>
            <input type="range" value="0" step="0.0001"/>
            <input type="number" step="0.0001" />
        `;
        li.setAttribute('joint-type', joint.jointType);
        li.setAttribute('joint-name', joint.name);
        sliderList.appendChild(li);

        const slider = li.querySelector('input[type="range"]');
        const input = li.querySelector('input[type="number"]');
        li.update = () => {
            let degVal = joint.angle * RAD2DEG;
            input.value = slider.value = degVal.toFixed(2);

            if (viewer.ignoreLimits || joint.jointType === 'continuous') {
                slider.min = -360;
                slider.max = 360;
            } else {
                slider.min = joint.limit.lower * RAD2DEG;
                slider.max = joint.limit.upper * RAD2DEG;
            }
            input.min = slider.min;
            input.max = slider.max;
        };

        slider.addEventListener('input', () => {
            viewer.setJointValue(joint.name, parseFloat(slider.value) * DEG2RAD);
            li.update();
        });

        input.addEventListener('change', () => {
            viewer.setJointValue(joint.name, parseFloat(input.value) * DEG2RAD);
            li.update();
        });

        li.update();
        sliders[joint.name] = li;
    });
});


document.addEventListener('WebComponentsReady', () => {
    viewer.loadMeshFunc = (path, manager, done) => {
        new THREE.ModelLoader(manager).load(path, res => done(res.model), null, err => done(null, err));
    };

    document.querySelector('li[urdf]').dispatchEvent(new Event('click'));

    if (/example\/build/i.test(window.location)) {
        viewer.package = '../../../urdf';
    }
});


