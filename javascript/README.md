# urdf-loader

[![npm version](https://img.shields.io/npm/v/urdf-loader.svg?style=flat-square)](https://www.npmjs.com/package/urdf-loader)
[![build](https://img.shields.io/github/actions/workflow/status/gkjohnson/urdf-loaders/node.js.yml?style=flat-square&label=build&branch=master)](https://github.com/gkjohnson/urdf-loaders/actions)

Utilities for loading URDF files into THREE.js and a Web Component that loads and renders the model.

[Basic loader example here!](https://gkjohnson.github.io/urdf-loaders/javascript/example/bundle/simple.html)

[VR example here!](https://gkjohnson.github.io/urdf-loaders/javascript/example/bundle/vr.html)

[Drag and drop web component tool here!](https://gkjohnson.github.io/urdf-loaders/javascript/example/bundle/index.html)

![Example](/javascript/docs/javascript-example.gif)

# Use

#### Basic Use

Loading a URDF file from a server.

```js
import { LoadingManager } from 'three';
import URDFLoader from 'urdf-loader';

// ...init three.js scene...

const manager = new LoadingManager();
const loader = new URDFLoader( manager );
loader.packages = {
    packageName : './package/dir/'            // The equivalent of a (list of) ROS package(s):// directory
};
loader.load(
  'T12/urdf/T12.URDF',                    // The path to the URDF within the package OR absolute
  robot => {

    // The robot is loaded!
    scene.add( robot );

  }
);
```

#### Custom Mesh Loader & Error Handling

Implementing custom error handling and / or adding a custom loader for meshes can be done using the [loadMeshCb](#loadMeshCb) callback.

```js
import { GLTFLoader } from 'three/examples/loaders/GLTFLoader.js';
import URDFLoader from 'urdf-loader';

// ...init three.js scene...

const loader = new URDFLoader();
loader.loadMeshCb = function( path, manager, onComplete ) {

    const gltfLoader = new GLTFLoader( manager );
    gltfLoader.load(
        path,
        result => {

            onComplete( result.scene );

        },
        undefined,
        err => {
        
            // try to load again, notify user, etc
        
            onComplete( null, err );
        
        }
    );

};
loader.load( 'T12/urdf/T12.URDF', robot => {

    // The robot is loaded!
    scene.add( robot );

} );

```

#### From Xacro

Using [XacroParser](https://github.com/gkjohnson/xacro-parser) to process a Xacro URDF file and then parse it.

```js
import { LoaderUtils } from 'three';
import { XacroLoader } from 'xacro-parser';
import URDFLoader from 'urdf-loader';

// ...init three.js scene...

const url = './path/to/file.xacro';
const xacroLoader = new XacroLoader();
xacroLoader.load( url, xml => {

    const urdfLoader = new URDFLoader();
    urdfLoader.workingPath = LoaderUtils.extractUrlBase( url );

    const robot = urdfLoader.parse( xml );
    scene.add( robot );

} );
```

### Adjusting Joint Angles

```js
robot.setJointValue( jointName, jointAngle );

// or

robot.joints[ jointName ].setJointValue( jointAngle );
```

# API

See [API.md](./API.md) for full API documentation.

# Running the Example

Install Node.js and NPM.

Run `npm install`.

Run `npm start`.

Visit `localhost:9080/javascript/example/dev-bundle/` to view the page.

# LICENSE

The software is available under the [Apache V2.0 license](../LICENSE).

Copyright © 2020 California Institute of Technology. ALL RIGHTS
RESERVED. United States Government Sponsorship Acknowledged.
Neither the name of Caltech nor its operating division, the
Jet Propulsion Laboratory, nor the names of its contributors may be
used to endorse or promote products derived from this software
without specific prior written permission.
