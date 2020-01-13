# unity urdf-loader

Utilities for loading URDF files and STL geometry into Unity

![Example](../docs/unity-example.gif)

## Use
```cs
StreamReader reader = new StreamReader(".../path/to/urdf");
string content = reader.ReadToEnd();
URDFRobot ur = URDFLoader.BuildRobot(".../package/dir", content);
```

## API
### URDFLoader
#### LoadRobot(urdfPath, package, options) : URDFRobot
Reads and processes the urdf at the given path, returning a `URDFRobot` that describes the whole robot.

##### urdfpath : String
The path to the URDF file relative to the specified package directory.

##### package : String | Dictionary<string, string>
If the package is just a string then it replaces the `package://` portion of the path.

If it is a dictionary then it represents a list of packages by `packageName : packagePath` so that multiple packages can be specified.

##### options : URDFLoader.Options

_optional_

Set of options for the loader.

#### BuildRobot(urdfContent, package, options) : URDFRobot
Same function as above, but this function takes the raw contents of the urdf file rather than a path.

##### urdfContent : String

The urdf content to parse into a robot.

##### package : String | Dictionary<string, string>

See `LoadURDFRobot`.

##### options : URDFLoader.Options

_optional_

Set of options for the loader.

### URDFLoader.Options

Struct with a set of optional fields to augment the behavior of the loader.

##### loadMeshCb : System.Action<string, string, System.Action<GameObject[]>>
A function for loading geometry in a custom way or in unsupported formats. `URDFLoader.LoadMesh` is used by default.

The function is passed a path to the model, the models file extension and a callback to pass an array of game objects when finished.

##### target : URDFRobot
An existing URDFRobot to build the robot in to.

##### workingPath : String

The directory to use to resolve relative file paths in the URDF. Defaults to the URDF directory when using `LoadRobot`.

### URDFRobot
#### SetAngle(name, rad)
Sets the angle (in radians) of the joint with the given name. Throws an error if the joint does not exist.

#### TrySetAngle(name, rad) : Boolean
Same as above, but does not throw an error. Returns `true` if it was able to set the angle.

#### GetAnglesAsDictionary() : Dictionary<string, float>
Returns a new `Dictionary<string, float>` with the current angle of all the joints on the robot.

#### SetAnglesFromDictionary(angles)
Takes a `Dictionary<string, float>` and sets all the angles on the robot that are listed in the dictionary.

## Limitations
- The Collada model loader currently does not support textures or materials and loads the models with an offset rotation ([Issue #52](https://github.com/gkjohnson/urdf-loaders/issues/52))

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
