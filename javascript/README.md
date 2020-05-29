# urdf-loader

[![npm version](https://img.shields.io/npm/v/urdf-loader.svg?style=flat-square)](https://www.npmjs.com/package/urdf-loader)
[![travis build](https://img.shields.io/travis/gkjohnson/urdf-loaders/master.svg?style=flat-square)](https://travis-ci.com/gkjohnson/urdf-loaders)
[![lgtm code quality](https://img.shields.io/lgtm/grade/javascript/g/gkjohnson/urdf-loaders.svg?style=flat-square&label=code-quality)](https://lgtm.com/projects/g/gkjohnson/urdf-loaders/)

Utilities for loading URDF files into THREE.js and a Web Component that loads and renders the model.

[Demo here!](https://gkjohnson.github.io/urdf-loaders/javascript/example/index.bundle.html)

![Example](/javascript/docs/javascript-example.gif)

# Use

Loading a URDF file from a server.

```js
import { LoadingManager } from 'three';
import URDFLoader from 'urdf-loader';

// ...init three.js scene...

const manager = new LoadingManager();
const loader = new URDFLoader(manager);
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

Using [XacroParser](github.com/gkjohnson/xacro-parser) to process a Xacro URDF file and then parse it.

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

## Limitations
- Only `prismatic`, `continuous`, `revolute`, and `fixed` joints are supported.

# API

## URDFOptions

List of options available on the URDFLoader class.

### .packages

```js
packages = '' : String | Object
```

The path representing the `package://` directory(s) to load `package://` relative files.

If the argument is a string, then it is used to replace the `package://` prefix when loading geometry.

To specify multiple packages an object syntax is used defining the package name to the package path:
```js
{
  "package1": "./path/to/package1",
  "package2": "./path/to/package2",
  ...
}
```

### .loadMeshCb

```js
loadMeshCb = null :
    (
        pathToModel : string,
        manager : LoadingManager,
        onComplete : ( obj : Object3D ) => void
    ) => void
```

An optional function that can be used to override the default mesh loading functionality. The default loader is specified at `URDFLoader.defaultMeshLoader`.

`pathToModel` is the url to load the model from.

`manager` is the THREE.js `LoadingManager` used by the `URDFLoader`.

`onComplete` is called with the mesh once the geometry has been loaded.

### .fetchOptions

```js
fetchOptions = null : Object
```

An optional object with the set of options to pass to the `fetch` function call used to load the URDF file.

### .workingPath

```js
workingPath = '' : string
```

The path to load geometry relative to.

Defaults to the path relative to the loaded URDF file.

### .parseVisual

```js
parseVisual = true : boolean
```

An optional value that can be used to enable / disable loading meshes for links from the `visual` nodes. Defaults to true.

### .parseCollision

```js
parseCollision = false : boolean
```

An optional value that can be used to enable / disable loading meshes for links from the `collision` nodes. Defaults to false.

## URDFLoader

### .constructor

```js
constructor( manager : LoadingManager )
```

Constructor. Manager is used for transforming load URLs and tracking downloads.

### .load

```js
load(
    urdfpath : string,
    onComplete : (robot : URDFRobot) => void,
    onProgress? : () => void,
    onError? : (error : Error) => void
) : void
```

Loads and builds the specified URDF robot in THREE.js.

Takes a path to load the urdf file from, a func to call when the robot has loaded, and a set of options.

### .parse

```js
parse( urdfContent : string | Document | Element ) : URDFRobot
```

Parses URDF content and returns the robot model. Takes an XML string to parse and a set of options.

If the XML document has already been parsed using `DOMParser` then either the returned `Document` or root `Element` can be passed into this function in place of the string, as well.

Note that geometry will not necessarily be loaded when the robot is returned.

## URDFJoint

_extends Object3D_

An object representing a robot joint.

### .name

```js
name : string
```

The name of the joint.

### .jointType

```js
.jointType : string
```

The type of joint. Can only be the URDF types of joints.

### .limit

```js
.limit : { lower : number, upper : number }
```

An object containing the `lower` and `upper` constraints for the joint.

### .axis

```js
axis : Vector3
```

The axis described for the joint.

### .angle

_readonly_

```js
angle : number
```

The current position or angle for joint.

### .ignoreLimits

```js
ignoreLimits : boolean
```

Whether or not to ignore the joint limits when setting a the joint position.

### .setAngle, .setOffset

```js
setAngle( angle : number ) : void
setOffset( position : number ) : void
```

Takes the position off of the starting position to rotate or move the joint to.

## URDFLink

_extends Object3D_

### .name

```js
name : string
```

The name of the link.

## URDFRobot

_extends [URDFLink](#URDFLink)_

Object that describes the URDF Robot.

### .robotName

```js
robotName : string
```

The name of the robot described in the `<robot>` tag.

### .links

```js
links : { [key] : URDFLink }
```

A dictionary of `linkName : URDFLink` with all links in the robot.

### .joints

```js
joints : { [key] : URDFJoint }
```

A dictionary of `jointName : URDFJoint` with all joints in the robot.

## urdf-viewer Element
```html
<!-- Register the Element -->
<script href=".../urdf-viewer-element.js"></script>
<script>customElements.define('urdf-viewer', URDFViewer)</script>

<body>
  <urdf-viewer package=".../package/dir/" urdf="T12/urdf/T12.URDF" up="Z+" display-shadow ambient-color="red"></urdf-viewer>
</body>
```

### Attributes

#### package

Corresponds to the `package` parameter in `URDFLoader.load`. Supported are:

1. Single package:

    ```html
    <!-- 1. Example for single package named `default_package` -->
    <urdf-viewer package=".../path/to/default_package" ...></urdf-viewer>
    ```

    Fallback within 1: If the target package within the `package://` relative files do not match the default path it is assumed that the default path is the parent folder that contains the target package(s).

    ```html
    <!-- 1. Example for single package named `default_package` with fallback: -->
    <urdf-viewer package=".../path/to/parent" ...></urdf-viewer>
    <!-- since `parent` does not match `default_package`
         the path ".../path/to/parent/default_package" is assumed -->
    ```

2. Serialized package map:

    E.g. if the meshes of a URDF are distributed over mutliple packages.

    ```html
    <!-- 2. Example for serialized package map that contains `package1` and `package2` -->
    <urdf-viewer package="package1:.../path/to/package1, package2:.../path/to/package1" ...></urdf-viewer>
    ```

#### urdf

Corresponds to the `urdfpath` parameter in `URDFLoader.load`.

The element uses fetch options `{ mode: 'cors', credentials: 'same-origin' }` to load the urdf file.

#### ignore-limits

Whether or not hte display should ignore the joint limits specified in the model when updating angles.

#### up

The axis to associate with "up" in THREE.js. Values can be [+-][XYZ].

#### display-shadow

Whether or not the render the shadow under the robot.

#### ambient-color

The color of the ambient light specified with css colors.

#### auto-redraw

Automatically redraw the model every frame instead of waiting to be dirtied.

#### no-auto-recenter

Recenter the camera only after loading the model.

### Properties

All of the above attributes have corresponding camel case properties.

#### .angles

```js
angles : Object
```

Sets or gets the angles of the robot as a dictionary of `joint-name` to `radian` pairs.

### Functions

#### setAngle

```js
setAngle( jointName : string, angle : Number ) : void
```

Sets the given joint to the provided angle in radians.

#### .setAngles

```js
setAngles( jointDictionary : Object ) : void
```

Sets all joint names specified as keys to radian angle value.

#### .redraw

```js
redraw() : void
```

Dirty the renderer so the element will redraw next frame.

#### .recenter

```js
recenter() : void
```

Recenter the camera to the model and redraw.

### Events

#### 'urdf-change'

Fires when the URDF has changed and a new one is starting to load.

#### 'ignore-limits-change'

Fires when the `ignore-limits` attribute changes.

#### 'urdf-processed'

Fires when the URDF has finished loading and getting processed.

#### 'geometry-loaded'

Fires when all the geometry has been fully loaded.

# Running the Example

Install Node.js and NPM.

Run `npm install`.

Run `npm start`.

Visit `localhost:9080/javascript/example/` to view the page.

# LICENSE

The software is available under the [Apache V2.0 license](../LICENSE.txt).

Copyright © 2019 California Institute of Technology. ALL RIGHTS
RESERVED. United States Government Sponsorship Acknowledged. This software may
be subject to U.S. export control laws. By accepting this software,
the user agrees to comply with all applicable U.S. export laws and
regulations. User has the responsibility to obtain export licenses,
or other export authority as may be required before exporting such
information to foreign countries or providing access to foreign
persons. Neither the name of Caltech nor its operating division, the
Jet Propulsion Laboratory, nor the names of its contributors may be
used to endorse or promote products derived from this software
without specific prior written permission.
