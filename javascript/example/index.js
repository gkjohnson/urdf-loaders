/*eslint-disable*/
// Converts a datatransfer structer into an object with all paths and files
// listed out. Returns a promise that resolves with the file structure.
function dataTransferToFiles(dataTransfer) {

    if (!(dataTransfer instanceof DataTransfer)) {

        throw new Error('Data must be of type "DataTransfer"', dataTransfer)

    }

    const files = {}

    // recurse down the webkit file structure resolving
    // the paths to files names to store in the `files`
    // object
    function recurseDirectory(item) {

        if (item.isFile) {

            return new Promise(resolve => {
                item.file(file => {
                    files[item.fullPath] = file
                    resolve()
                })
            })

        } else {

            const reader = item.createReader()

            return new Promise(resolve => {

                const promises = []
                reader.readEntries(et => {
                    et.forEach(e => {
                        promises.push(recurseDirectory(e))
                    })

                    Promise.all(promises).then(() => resolve())
                })
            })

            return Promise.all(promises)
        }
    }

    return new Promise(resolve => {

        // Traverse down the tree and add the files into the zip
        const dtitems = dataTransfer.items && [...dataTransfer.items]
        const dtfiles = [...dataTransfer.files]

        if (dtitems && dtitems.length && dtitems[0].webkitGetAsEntry) {

            const promises = []
            for (let i = 0; i < dtitems.length; i ++) {
                const item = dtitems[i]
                const entry = item.webkitGetAsEntry()

                promises.push(recurseDirectory(entry))

            }
            Promise.all(promises).then(() => resolve(files))

        } else {

            // add a '/' prefix to math the file directory entry
            // on webkit browsers
            dtfiles
                .filter(f => f.size !== 0)
                .forEach(f => files['/' + f.name] = f)

            resolve(files)

        }
    })
}

const viewer = document.querySelector('urdf-viewer')
const animToggle = document.getElementById('do-animate')
const limitsToggle = document.getElementById('ignore-joint-limits')
const upSelect = document.getElementById('up-select')
const sliderList = document.querySelector('#controls ul')
const controlsel = document.getElementById('controls')
const controlsToggle = document.getElementById('toggle-controls')
const DEG2RAD = Math.PI / 180
const RAD2DEG = 1 / DEG2RAD
let sliders = {}

const lerp = (from, to, ratio) => from + (to - from) * ratio

const updateAngles = () => {
    if (!viewer.setAngle) return

    // reset everything to 0 first
    const resetangles = viewer.angles
    for(const name in resetangles) resetangles[name] = 0
    viewer.setAngles(resetangles)

    // animate the legs
    const time = Date.now() / 3e2
    for(let i = 1; i <= 6; i ++) {
        const offset = i * Math.PI / 3
        const ratio = Math.max(0, Math.sin(time + offset))

        viewer.setAngle(`HP${i}`, lerp(30, 0, ratio) * DEG2RAD)
        viewer.setAngle(`KP${i}`, lerp(90, 150, ratio) * DEG2RAD)
        viewer.setAngle(`AP${i}`, lerp(-30, -60, ratio) * DEG2RAD)

        viewer.setAngle(`TC${i}A`, lerp(0, 0.065, ratio))
        viewer.setAngle(`TC${i}B`, lerp(0, 0.065, ratio))

        viewer.setAngle(`W${i}`, window.performance.now() * 0.001)
    }

    const ratio = Math.sin(time) / 2 + 0.5
}


const updateLoop = () => {
    if (animToggle.classList.contains('checked')) {
        updateAngles()
        Object.values(sliders).forEach(li => li.update())
    }

    requestAnimationFrame(updateLoop)
}

// toggle checkbox
animToggle.addEventListener('click', () => animToggle.classList.toggle('checked'))

limitsToggle.addEventListener('click', () => {
    limitsToggle.classList.toggle('checked')
    viewer.ignoreLimits = limitsToggle.classList.contains('checked')
})

upSelect.addEventListener('change', () => viewer.up = upSelect.value)

controlsToggle.addEventListener('click', () => controlsel.classList.toggle('hidden'))

// watch for urdf changes
viewer.addEventListener('urdf-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.remove())
    sliders = {}

})

viewer.addEventListener('ignore-limits-change', () => {

    Object
        .values(sliders)
        .forEach(sl => sl.update())
})

// create the sliders
viewer.addEventListener('urdf-processed', () => {

    const r = viewer.robot
    Object
        .keys(r.urdf.joints)
        .sort((a, b) => {

            const da = a.split(/[^\d]+/g).filter(v => !!v).pop()
            const db = b.split(/[^\d]+/g).filter(v => !!v).pop()

            if (da !== undefined && db !== undefined) {
                const delta = parseFloat(da) - parseFloat(db)
                if (delta !== 0) return delta
            }

            if (a > b) return 1
            if (b > a) return -1
            return 0

        })
        .map(key => r.urdf.joints[key])
        .forEach(joint => {

            const li = document.createElement('li')
            li.innerHTML =
            `
            <span title="${joint.name}">${joint.name}</span>
            <input type="range" value="0" step="0.0001"/>
            <input type="number" step="0.0001" />
            `

            sliderList.appendChild(li)

            const slider = li.querySelector('input[type="range"]')
            const input = li.querySelector('input[type="number"]')
            li.update = () => {
                let val = joint.urdf.type === 'revolute' ? joint.urdf.angle * RAD2DEG : joint.urdf.angle
                if (Math.abs(val) > 1) val = val.toFixed(1)
                else val = val.toPrecision(2)

                input.value = parseFloat(val)
                slider.value = joint.urdf.angle

                if (viewer.ignoreLimits) {
                    slider.min = -6.28
                    slider.max = 6.28

                    input.min = -6.28
                    input.max = 6.28
                } else {
                    slider.min = joint.urdf.limits.lower
                    slider.max = joint.urdf.limits.upper

                    input.min = joint.urdf.limits.lower
                    input.max = joint.urdf.limits.upper
                }
            }

            switch(joint.urdf.type) {
                case 'continuous':
                case 'prismatic':
                case 'revolute':
                    break;
                default:
                    li.update = () => {}
                    angleel.remove()
                    slider.remove()
            }

            slider.addEventListener('input', () => {
                viewer.setAngle(joint.name, slider.value)
                li.update()
            })

            input.addEventListener('change', () => {
                viewer.setAngle(joint.name, input.value)
                li.update()
            })

            li.update()

            sliders[joint.name] = li

        })

})


document.addEventListener('dragover', e => e.preventDefault())
document.addEventListener('dragenter', e => e.preventDefault())
document.addEventListener('drop', e => {

    e.preventDefault()

    // convert the files
    dataTransferToFiles(e.dataTransfer)
        .then(files => {

            // set the loader url modifier to check the list
            // of files
            viewer.loadingManager.setURLModifier(url => {

                // TODO: This won't work for paths that traverse up
                // and down (/example/../path/model.ply)
                url = url.replace(viewer.package, '')
                url = url.replace(/^[\.\\\/]*/, '')

                // keep trying a shorter path to see if it matches because the
                // mesh URLs in the URDF assume file structure that we don't
                // have access to here
                const split = url.split('/')
                while (split.length) {

                    const newurl = '/' + split.join('/')
                    if (newurl in files) {

                        // revoke the url after it's been used
                        const bloburl = URL.createObjectURL(files[newurl])
                        requestAnimationFrame(() => URL.revokeObjectURL(bloburl))

                        return bloburl
                    }

                    split.shift()

                }

                return url
            })

            // set the source of the element to the most likely intended display model
            const filesNames = Object.keys(files)
            viewer.urdf =
                filesNames
                    .filter(n => /urdf$/i.test(n))
                    .shift()

            // remove the url modifier function is it doesn't affect other actions
            viewer.addEventListener(
                'geometry-loaded',
                () => viewer.loadingManager.setURLModifier(null),
                { once: true }
            )

        })

    document.body.style.backgroundColor = '#263238'
    animToggle.classList.remove('checked')

})

document.querySelectorAll('#urdf-options li[urdf]').forEach(el => {
    el.addEventListener('click', e => {
        const urdf = e.target.getAttribute('urdf')
        const color = e.target.getAttribute('color')

        viewer.urdf = urdf
        document.body.style.backgroundColor = color
        animToggle.classList.add('checked')

    })
})

document.addEventListener('WebComponentsReady', () => {

    const modelLoader = new THREE.ModelLoader(viewer.loadingManager);
    viewer.urdfLoader.defaultMeshLoader = (path, ext, done) => {
        modelLoader.load(path, res => done(res.model));
    }

    viewer.addEventListener('urdf-processed', e => updateAngles())
    document.querySelector('li[urdf]').dispatchEvent(new Event('click'))

    if (/javascript\/example\/build/i.test(window.location)) {
        viewer.package = '../../../urdf'
    }

    updateLoop()
})
