# unity urdf-loader

Utilities for loading URDF files and STL geometry into Unity

![Example](../docs/unity-example.gif)

## Use
```cs
StreamReader reader = new StreamReader(".../path/to/urdf");
string content = reader.ReadToEnd();
URDFJointList ujl = URDFParser.BuildRobot(".../package/dir", content);
```

### API
#### URDFParser.LoadURDFRobot(package, urdfpath, loadmeshFunction)
Reads and processes the urdf at the given path, returning a `URDFJointList` that describes the whole robot.

##### package
The path representing the package:// directory to load package:// relative files.

##### urdf
The path to the URDF file relative to the specified package directory.

##### loadmeshFunction
An optional function for loading geometry in a custom way or in unsupported formats. `URDFLoader.LoadMesh` is used by default.

#### URDFParser.BuildRobot(package, urdfcontent, loadMeshFunction)
Same function as above, but this function takes the raw contents of the urdf file rather than a path.

#### URDFJointList.SetAngle(name, rad)
Sets the angle (in radians) of the joint with the given name. Throws an error if the joint does not exist.

#### URDFJointList.TrySetAngle(name, rad)
Same as above, but does not throw an error.

#### URDFJointList.GetAnglesAsDictionary()
Returns a new `Dictionary<string, float>` with the current angle of all the joints on the robot.

#### URDFJointList.SetAnglesFromDictionary(angles)
Takes a `Dictionary<string, float>` and sets all the angles on the robot that are listed in the dictionary.

## Limitations
- The Collada model loader currently does not support textures or materials and loads the models with an offset rotation ([#52](Issue https://github.com/gkjohnson/urdf-loaders/issues/52))

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
