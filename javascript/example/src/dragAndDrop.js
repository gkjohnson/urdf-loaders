/* globals animToggle viewer setColor */

let uploadedURDFPath = ''; // Global variable to store the path of the uploaded URDF file

// Converts a datatransfer structer into an object with all paths and files
// listed out. Returns a promise that resolves with the file structure.
function dataTransferToFiles(dataTransfer) {

    if (!(dataTransfer instanceof DataTransfer)) {
        throw new Error('Data must be of type "DataTransfer"', dataTransfer);
    }

    const files = {};

    // recurse down the webkit file structure resolving
    // the paths to files names to store in the `files`
    // object
    function recurseDirectory(item) {
        if (item.isFile) {
            return new Promise(resolve => {
                item.file(file => {
                    files[item.fullPath] = file;
                    resolve();
                });
            });
        } else {
            const reader = item.createReader();
            return new Promise(resolve => {
                const promises = [];
                reader.readEntries(et => {
                    et.forEach(e => {
                        promises.push(recurseDirectory(e));
                    });
                    Promise.all(promises).then(() => resolve());
                });
            });
        }
    }

    return new Promise(resolve => {
        // Traverse down the tree and add the files into the zip
        const dtitems = dataTransfer.items && [...dataTransfer.items];
        const dtfiles = [...dataTransfer.files];

        if (dtitems && dtitems.length && dtitems[0].webkitGetAsEntry) {
            const promises = [];
            for (let i = 0; i < dtitems.length; i++) {
                const item = dtitems[i];
                const entry = item.webkitGetAsEntry();
                promises.push(recurseDirectory(entry));
            }
            Promise.all(promises).then(() => resolve(files));
        } else {
            // add a '/' prefix to match the file directory entry
            // on webkit browsers
            dtfiles
                .filter(f => f.size !== 0)
                .forEach(f => files['/' + f.name] = f);

            resolve(files);
        }
    });
}

export function registerDragEvents(viewer, callback) {
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('dragenter', e => e.preventDefault());
    document.addEventListener('drop', e => {
        e.preventDefault();

        // convert the files
        dataTransferToFiles(e.dataTransfer)
            .then(files => {
            // removes '..' and '.' tokens and normalizes slashes
                const cleanFilePath = path => {
                    return path
                        .replace(/\\/g, '/')
                        .split(/\//g)
                        .reduce((acc, el) => {
                            if (el === '..') acc.pop();
                            else if (el !== '.') acc.push(el);
                            return acc;
                        }, [])
                        .join('/');
                };

                // set the loader url modifier to check the list
                // of files
                const fileNames = Object.keys(files).map(n => cleanFilePath(n));
                viewer.urlModifierFunc = url => {
                // find the matching file given the requested url
                    const cleaned = cleanFilePath(url.replace(viewer.package, ''));
                    const fileName = fileNames
                        .filter(name => {
                        // check if the end of file and url are the same
                            const len = Math.min(name.length, cleaned.length);
                            return cleaned.substr(cleaned.length - len) === name.substr(name.length - len);
                        }).pop();

                    if (fileName !== undefined) {
                    // revoke the url after it's been used
                        const bloburl = URL.createObjectURL(files[fileName]);
                        requestAnimationFrame(() => URL.revokeObjectURL(bloburl));

                        return bloburl;
                    }

                    return url;
                };

                // set the source of the element to the most likely intended display model
                const filesNames = Object.keys(files);
                viewer.up = '+Z';
                document.getElementById('up-select').value = viewer.up;

                const urdfFile = filesNames
                    .filter(n => /urdf$/i.test(n))
                    .shift();

                if (urdfFile) {
                    const bloburl = URL.createObjectURL(files[urdfFile]);
                    uploadedURDFPath = bloburl; // Update the global variable
                    console.log("URDF file path:", uploadedURDFPath); // Log the path of the URDF file
                    viewer.urdf = bloburl; // Set the URDF file to the viewer
                }
            }).then(() => callback());;

        //setColor('#3e4952');
        window.animToggle.classList.remove('checked');
    });

}
