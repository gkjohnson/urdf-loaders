/* eslint-disable */
/* globals animToggle viewer */
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
            for (let i = 0; i < dtitems.length; i++) {
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
