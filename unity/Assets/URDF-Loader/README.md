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
#### LoadRobot(urdfPath, package, loadmeshFunction) : URDFRobot
Reads and processes the urdf at the given path, returning a `URDFRobot` that describes the whole robot.

##### urdfpath : String
The path to the URDF file relative to the specified package directory.

##### package : String
The path representing the package:// directory to load package:// relative files.

##### loadmeshFunction : System.Action<string, string, System.Action<GameObject[]>>
An optional function for loading geometry in a custom way or in unsupported formats. `URDFLoader.LoadMesh` is used by default.

The function is passed a path to the model, the models file extension and a callback to pass an array of game objects when finished.

#### BuildRobot(urdfContent, package, workingPath, loadMeshFunction, jointList) : URDFRobot
Same function as above, but this function takes the raw contents of the urdf file rather than a path.

##### urdfContent : String

The urdf content to parse into a robot.

##### package : String

See `LoadURDFRobot`.

##### workingPath : String

The directory to use to resolve relative file paths in the URDF.

##### loadMeshFunction : System.Action<string, string, System.Action<GameObject[]>>

See `LoadURDFRobot`.

##### jointList : URDFRobot

An existing URDFRobot to build the robot in to.

#### URDFRobot.SetAngle(name, rad)
Sets the angle (in radians) of the joint with the given name. Throws an error if the joint does not exist.

#### URDFRobot.TrySetAngle(name, rad) : Boolean
Same as above, but does not throw an error. Returns `true` if it was able to set the angle.

#### URDFRobot.GetAnglesAsDictionary() : Dictionary<string, float>
Returns a new `Dictionary<string, float>` with the current angle of all the joints on the robot.

#### URDFRobot.SetAnglesFromDictionary(angles)
Takes a `Dictionary<string, float>` and sets all the angles on the robot that are listed in the dictionary.

## Limitations
- The Collada model loader currently does not support textures or materials and loads the models with an offset rotation ([Issue #52](https://github.com/gkjohnson/urdf-loaders/issues/52))

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
