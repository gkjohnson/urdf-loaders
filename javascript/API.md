<!-- This file is generated automatically. Do not edit it directly. -->
# urdf-loader

## URDFOptions

List of options available on the URDFLoader class.


### .packages

```js
packages = '': string | Object | ( pkg: string ) => string
```

The path representing the `package://` directory(s) to load `package://` relative files. If the argument is a string it is used to replace the `package://` prefix. To specify multiple packages use an object mapping package names to paths. If set to a function it takes the package name and returns the package path.

### .loadMeshCb

```js
loadMeshCb = null: ( pathToModel: string, manager: LoadingManager, onComplete: ( obj: Object3D, err: Error ) => void ) => void
```

An optional function that can be used to override the default mesh loading functionality. The default loader is specified at `URDFLoader.defaultMeshLoader`.

### .fetchOptions

```js
fetchOptions = null: Object
```

An optional object with the set of options to pass to the `fetch` function call used to load the URDF file.

### .workingPath

```js
workingPath = '': string
```

The path to load geometry relative to. Defaults to the path relative to the loaded URDF file.

### .parseVisual

```js
parseVisual = true: boolean
```

An optional value that can be used to enable / disable loading meshes for links from the `visual` nodes. Defaults to true.

### .parseCollision

```js
parseCollision = false: boolean
```

An optional value that can be used to enable / disable loading meshes for links from the `collision` nodes. Defaults to false.

## URDFJoint

_extends `Object3D`_

An object representing a robot joint.


### .jointType

```js
jointType: string
```

The type of joint. Can only be the URDF types of joints.


### .angle

```js
readonly angle: number
```

The current position or angle for joint.


### .name

```js
name: string
```

The name of the joint.


### .axis

```js
axis: Vector3
```

The axis described for the joint.


### .limit

```js
limit: {
	lower = 0: number,
	upper = 0: number,
	effort = 0: number,
	velocity = 0: number
}
```

An object containing the lower and upper position constraints, as well as the effort and velocity limits for the joint. All fields default to zero if not specified in the URDF.


### .ignoreLimits

```js
ignoreLimits: boolean
```

Whether or not to ignore the joint limits when setting a the joint position.


### .mimicJoints

```js
mimicJoints: Array<URDFMimicJoint>
```

A list of joints which mimic this joint. These joints are updated whenever this joint is.


### .setJointValue

```js
setJointValue( ...values: number | null ): boolean
```

Sets the joint value(s) for the given joint. The interpretation of the value depends on the
joint type. If the joint value specifies an angle it must be in radians. If the value
specifies a distance, it must be in meters. Passing null for any component of the value will
skip updating that particular component.


## URDFMimicJoint

_extends [`URDFJoint`](#urdfjoint)_

An object representing a robot joint which mimics another existing joint. The value of this
joint can be computed as `value = multiplier * other_joint_value + offset`.


### .mimicJoint

```js
mimicJoint: string
```

The name of the joint which this joint mimics.


### .offset

```js
offset: number = 0
```

Specifies the offset to add in the formula above. Defaults to 0 (radians for revolute joints, meters for prismatic joints).


### .multiplier

```js
multiplier: number = 1
```

Specifies the multiplicative factor in the formula above. Defaults to 1.0.


## URDFLink

_extends `Object3D`_

An object representing a robot link.


### .name

```js
name: string
```

The name of the link.


### .inertial

```js
inertial: {
	mass = 0: number,
	origin: {
		xyz: Array<number>,
		rpy: Array<number>
	},
	inertia: {
		ixx = 0: number,
		ixy = 0: number,
		ixz = 0: number,
		iyy = 0: number,
		iyz = 0: number,
		izz = 0: number
	}
}
```

The inertial properties of the link parsed from the `<inertial>` element. All fields default to zero if not specified in the URDF.


## URDFRobot

_extends [`URDFLink`](#urdflink)_

Object that describes the URDF Robot.


### .robotName

```js
robotName: string
```

The name of the robot described in the `<robot>` tag.


### .links

```js
links: Object<string, URDFLink>
```

A dictionary of `linkName : URDFLink` with all links in the robot.


### .joints

```js
joints: Object<string, URDFJoint>
```

A dictionary of `jointName : URDFJoint` with all joints in the robot.


### .colliders

```js
colliders: Object<string, Object3D>
```

A dictionary of `colliderName : Object3D` with all collision nodes in the robot.


### .visual

```js
visual: Object<string, Object3D>
```

A dictionary of `visualName : Object3D` with all visual nodes in the robot.


### .frames

```js
frames: Object<string, Object3D>
```

A dictionary of all the named frames in the robot including links, joints, colliders, and visual.


### .setJointValue

```js
setJointValue( name: string, ...angle: number ): boolean
```

Sets the joint value of the joint with the given name.


### .setJointValues

```js
setJointValues( jointValueDictionary: Object ): boolean
```

Sets the joint values for all the joints in the dictionary indexed by joint name.


## URDFLoader

Loads and builds the specified URDF robot in THREE.js.


### .constructor

```js
constructor( manager: LoadingManager )
```

Constructor. Manager is used for transforming load URLs and tracking downloads.

### .loadAsync

```js
loadAsync( urdfpath: string ): Promise<URDFRobot>
```

Promise-wrapped version of `load`.


### .load

```js
load(
	urdfpath: string,
	onComplete: ( robot: URDFRobot ) => void,
	onProgress: () => void,
	onError: ( error: Error ) => void
): void
```

Loads and builds the specified URDF robot in THREE.js. Takes a path to load the urdf file
from, a func to call when the robot has loaded, and a set of options.


### .parse

```js
parse( urdfContent: string | Document | Element ): URDFRobot
```

Parses URDF content and returns the robot model. Takes an XML string to parse and a set of
options. If the XML document has already been parsed using `DOMParser` then either the
returned `Document` or root `Element` can be passed into this function in place of the
string, as well.

Note that geometry will not necessarily be loaded when the robot is returned.


## URDFViewer

A custom HTML element that loads and displays a URDF robot model in a THREE.js scene.


### events

```js
// Fires when the URDF has changed and a new one is starting to load.
{ type: 'urdf-change' }

// Fires when the `ignore-limits` attribute changes.
{ type: 'ignore-limits-change' }

// Fires when the URDF has finished loading and getting processed.
{ type: 'urdf-processed' }

// Fires when all the geometry has been fully loaded.
{ type: 'geometry-loaded' }
```

### .package

```js
package: string
```

Corresponds to the `package` parameter in `URDFLoader.load`.


### .urdf

```js
urdf: string
```

Corresponds to the `urdfpath` parameter in `URDFLoader.load`.


### .ignoreLimits

```js
ignoreLimits: boolean
```

Whether or not the display should ignore the joint limits specified in the model when updating angles.


### .up

```js
up: string
```

The axis to associate with "up" in THREE.js. Values can be [+-][XYZ].


### .displayShadow

```js
displayShadow: boolean
```

Whether or not to render the shadow under the robot.


### .ambientColor

```js
ambientColor: string
```

The color of the ambient light specified with css colors.


### .autoRedraw

```js
autoRedraw: boolean
```

Automatically redraw the model every frame instead of waiting to be dirtied.


### .noAutoRecenter

```js
noAutoRecenter: boolean
```

Recenter the camera only after loading the model.


### .jointValues

```js
jointValues: Object
```

Sets or gets the jointValues of the robot as a dictionary of `joint-name` to `radian` pairs.


### .redraw

```js
redraw(): void
```

Dirty the renderer so the element will redraw next frame.


### .recenter

```js
recenter(): void
```

Recenter the camera to the model and redraw.


### .setJointValue

```js
setJointValue( jointName: string, ...jointValues: number | null ): void
```

Sets the given joint to the provided value(s). See URDFJoint.setJointValue.


### .setJointValues

```js
setJointValues( jointValueDictionary: Object ): void
```

Sets all joint names specified as keys to radian angle value.

