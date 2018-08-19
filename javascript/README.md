# javascript urdf-loader

[
    ![npm version](https://img.shields.io/npm/v/urdf-loader.svg?style=flat-square)
](https://www.npmjs.com/package/urdf-loader)
[
    ![travis build](https://img.shields.io/travis/gkjohnson/urdf-loaders.svg?style=flat-square)
](https://travis-ci.org/gkjohnson/urdf-loaders)
[
    ![lgtm code quality](https://img.shields.io/lgtm/grade/javascript/g/gkjohnson/urdf-loaders.svg?style=flat-square&label=code-quality)
](https://lgtm.com/projects/g/gkjohnson/urdf-loaders/)

Utilities for loading URDF files into THREE.js and a Web Component that loads and renders the model.

[Demo here!](https://gkjohnson.github.io/urdf-loaders/javascript/example/index.bundle.html)

![Example](/javascript/docs/javascript-example.gif)

## Use
```html
<script src=".../URDFLoader.js"></script>
<script>
  const manager = new THREE.LoadingManager();
  const loader = new URDFLoader(manager);
  loader.load(
    '.../package/dir/',           // The equivelant of a (list of) ROS package(s):// directory
    'T12/urdf/T12.URDF',          // The path to the URDF within the package OR absolute
    robot => { },                 // The robot is loaded!
    (path, ext, done) => { },     // Callback for each mesh for custom mesh processing and loading code
   );
</script>
```

### Limitations
- Only `prismatic`, `continuous`, `revolute`, and `fixed` joints are supported.
- Collision tags are not parsed.

## URDFLoader API
### constructor(manager)

Constructor

#### manager : THREE.LoadingManager

THREE.LoadingManager. Used for transforming load URLs.

### load(urdfpath, packages, onComplete, options)

Loads and builds the specified URDF robot in THREE.js

#### urdfpath : String

_required_

The path to the URDF file relative to the specified package directory.

#### packages : String | Object

_required_

The path representing the `package://` directory(s) to load `package://` relative files.

If the argument is a string, then it is used to replace the `package://` prefix when loading geometry.

To specify multiple packages an object syntax is used defining the package name to the package path:
```js
{
  "package1": ".../path/to/package1",
  "package2": ".../path/to/package2",
  ...
}
```

#### onComplete(robot) : Function

_required_

Callback that is called once the urdf robots have been loaded. The loaded robot is passed to the function.

See `URDFRobot` documentation.

#### options : Object

_optional_

##### options.loadMeshCallback(pathToModel, fileExtension, onComplete) : Function

An optional function that can be used to override the default mesh loading functionality. The default loader is specified at `URDFLoader.defaultMeshLoader`. `onComplete` is called with the mesh once the geometry has been loaded.

##### options.fetchOptions : Object

An optional object with the set of options to pass to the `fetch` function call used to load the URDF file.

##### workingPath : String

The path to load geometry relative to.

Defaults to the path relative to the loaded URDF file.

### parse(urdfContent, packages, onComplete, options) : THREE.Object3D

Parses URDF content and returns the robot model.

#### urdfContent : String

_required_

The xml content of a URDF file.

#### packages : String | Object

_required_

See `load`.

#### onComplete(robot) : Function

_optional_

Called immediately with the generated robot. This is the same object that is returned from the function.

Note that the link geometry will not necessarily have finished being processed when this is called.

See `URDFRobot` documentation.

#### options : Object

See `load`.

## URDFRobot

Object that describes the URDF Robot. An extension of `THREE.Object3D`.

#### name : String

The name of the robot described in the `<robot>` tag.

#### links : Object

A dictionary of `linkName : URDFLink` with all links in the robot.

#### joints : Object

A dictionary of `jointName : URDFJoint` with all joints in the robot.

## URDFJoint

An object representing a robot joint. An extension of `THREE.Object3D`.

#### name : String

The name of the joint.

#### jointType : String

The type of joint. Can only be the URDF types of joints.

#### limit : Object

An object containing the `lower` and `upper` constraints for the joint.

#### axis : THREE.Vector3

The axis described for the joint.

#### angle : Number

_readonly_

The current position or angle for joint.

#### ignoreLimits : Boolean

Whether or not to ignore the joint limits when setting a the joint position.

### setAngle(angle) | setOffset(position)

#### angle | position : Number

The position off of the starting position to rotate or move the joint to.

## URDFLink

#### name

The name of the link.

## urdf-viewer Element
```html
<!-- Register the Element -->
<script href=".../urdf-viewer-element.js" />
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
    // 1. Example for single package named `default_package`
    <urdf-viewer package=".../path/to/default_package" ...></urdf-viewer>
    ```

    Fallback within 1: If the target package within the `package://` relative files do not match the default path it is assumed that the default path is the parent folder that contains the target package(s).

    ```html
    // 1. Example for single package named `default_package` with fallback:
    <urdf-viewer package=".../path/to/parent" ...></urdf-viewer>
    // since `parent` does not match `default_package`
    // the path ".../path/to/parent/default_package" is assumed
    ```

2. Serialized package map:

    E.g. if the meshes of a URDF are distributed over mutliple packages.

    ```html
    // 2. Example for serialized package map that contains `package1` and `package2`
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

### Properties

All of the above attributes have corresponding camel case properties.

#### angles

Sets or gets the angles of the robot as a dictionary of `joint-name` to `radian` pairs.

### Functions

#### setAngle(jointName, angle)

Sets the given joint to the provided angle in radians.

#### setAngles(jointDictionary)

Sets all joint names specified as keys to radian angle value.

#### redraw()

Dirty the renderer so the element will redraw next frame.

### Events

#### 'urdf-change'

Fires when the URDF has changed and a new one is starting to load.

#### 'ignore-limits-change'

Fires when the `ignore-limits` attribute changes.

#### 'urdf-processed'

Fires when the URDF has finished loading and getting processed.

#### 'geometry-loaded'

Fires when all the geometry has been fully loaded.

## Running the Example

Install Node.js and NPM.

Run `npm install`.

Run `npm run server`.

Visit `localhost:9080/javascript/example/` to view the page.

# LICENSE

The software is available under the [Apache V2.0 license](../LICENSE.txt).

Copyright © 2018 California Institute of Technology. ALL RIGHTS
RESERVED. United States Government Sponsorship Acknowledged. Any
commercial use must be negotiated with with Office of Technology
Transfer at the California Institute of Technology. This software may
be subject to U.S. export control laws. By accepting this software,
the user agrees to comply with all applicable U.S. export laws and
regulations. User has the responsibility to obtain export licenses,
or other export authority as may be required before exporting such
information to foreign countries or providing access to foreign
persons. Neither the name of Caltech nor its operating division, the
Jet Propulsion Laboratory, nor the names of its contributors may be
used to endorse or promote products derived from this software
without specific prior written permission.
