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

## URDFOptions

List of options available on the URDFLoader class.

### .packages

```js
packages = '' : String | Object | ( pkg : String ) => String
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

If the setting is set to a function then it takes the package name and is expected to return the package path.

### .loadMeshCb

```js
loadMeshCb = null :
    (
        pathToModel : string,
        manager : LoadingManager,
        onComplete : ( obj : Object3D, err ?: Error ) => void
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

### .loadAsync

```js
loadAsync( urdfpath : string ) : Promise<URDFRobot>
```

Promise-wrapped version of `load`.

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

### .mimicJoints

```js
mimicJoints : URDFMimicJoints[]
```

A list of joints which mimic this joint. These joints are updated whenever this joint is.

### .setJointValue

```js
setJointValue( ...jointValues : (number | null)[] ) : Boolean
```

Sets the joint value(s) for the given joint. The interpretation of the value depends on the joint type. If the joint value specifies an angle it must be in radians. If the value specifies a distance, it must be in meters. Passing null for any component of the value will skip updating that particular component.

Returns true if the joint or any of its mimicking joints changed.

## URDFMimicJoint

_extends URDFJoint_

An object representing a robot joint which mimics another existing joint. The value of this joint can be computed as `value = multiplier * other_joint_value + offset`.

### .mimicJoint

```js
mimicJoint : String
```

The name of the joint which this joint mimics.

### .offset

```js
offset : Number
```

Specifies the offset to add in the formula above. Defaults to 0 (radians for revolute joints, meters for prismatic joints).

### .multiplier

```js
multiplier : Number
```

Specifies the multiplicative factor in the formula above. Defaults to 1.0.

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

### .colliders

```js
colliders : { [key] : Object3D }
```

A dictionary of `colliderName : Object3D` with all collision nodes in the robot.

### .visual

```js
visual : { [key] : Object3D }
```

A dictionary of `visualName : Object3D` with all visual nodes in the robot.

### .frames

```js
joints : { [key] : URDFJoint }
```

A dictionary of all the named frames in the robot including links, joints, colliders, and visual.

### .setJointValue

```js
setJointValue( name : String, value : Number ) : Boolean
```

Sets the joint value of the joint with the given name. Returns true if the joint changed.

### .setJointValues

```js
setJointValues( jointValueDictionary : Object ) : Boolean
```

Sets the joint values for all the joints in the dictionary indexed by joint name. Returns true if a joint changed.

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

#### .jointValues

```js
jointValues : Object
```

Sets or gets the jointValues of the robot as a dictionary of `joint-name` to `radian` pairs.

### Functions

#### .setJointValue

```js
setJointValue( jointName : String, ...jointValues : (number | null)[] ) : void
```

Sets the given joint to the provided value(s). See URDFJoint.setJointValue.

#### .setJointValues

```js
setJointValues( jointValueDictionary : Object ) : void
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

Visit `localhost:9080/javascript/example/dev-bundle/` to view the page.

# LICENSE

The software is available under the [Apache V2.0 license](../LICENSE).

Copyright © 2020 California Institute of Technology. ALL RIGHTS
RESERVED. United States Government Sponsorship Acknowledged.
Neither the name of Caltech nor its operating division, the
Jet Propulsion Laboratory, nor the names of its contributors may be
used to endorse or promote products derived from this software
without specific prior written permission.
