/*
Reference coordinate frames for Unity and ROS.
The Unity coordinate frame is left handed and ROS is right handed, so
the axes are transformed to line up appropriately. See the "URDFToUnityPos"
and "URDFToUnityRot" functions.

Unity
   Y
   |   Z
   | ／
   .-----X


ROS URDf
       Z
       |   X
       | ／
 Y-----.

*/

using UnityEngine;
using System;
using System.Collections.Generic;
using System.Xml;
using System.IO;
using System.Globalization;

using URDFJoint = URDFRobot.URDFJoint;
using URDFLink = URDFRobot.URDFLink;

public class URDFLoader : MonoBehaviour {

    const string SINGLE_PACKAGE_KEY = "<DEFAULT>";

    public struct Options {

        public Action<string, string, Action<GameObject[]>> loadMeshCb;
        public string workingPath;
        public URDFRobot target;

    }

    // Public API
    // Load the URDF from file and build the robot
    // Takes a single package path which is assumed to be the package location for all meshes.
    public static URDFRobot Load(string urdfPath, string package, Options options = new Options()) {

        Dictionary<string, string> packages = new Dictionary<string, string>();
        packages.Add(SINGLE_PACKAGE_KEY, package);

        return Load(urdfPath, packages, options);

    }

    // Takes a dictionary of packages
    public static URDFRobot Load(string urdfPath, Dictionary<string, string> packages, Options options = new Options()) {

        StreamReader reader = new StreamReader(urdfPath);
        string content = reader.ReadToEnd();

        if (options.workingPath == null) {

            Uri uri = new Uri(urdfPath);
            options.workingPath = uri.Host + Path.GetDirectoryName(uri.PathAndQuery);

        }

        return Parse(content, packages, options);

    }

    // Parse the URDF file and return a URDFRobot instance with all associated links and joints
    public static URDFRobot Parse(string urdfPath, string package, Options options = new Options()) {

        Dictionary<string, string> packages = new Dictionary<string, string>();
        packages.Add(SINGLE_PACKAGE_KEY, package);

        return Parse(urdfPath, packages, options);

    }

    public static URDFRobot Parse(string urdfContent, Dictionary<string, string> packages, Options options = new Options()) {

        if (options.loadMeshCb == null) {

            options.loadMeshCb = LoadMesh;

        }

        // Parse the XML doc
        XmlDocument doc = new XmlDocument();
        doc.LoadXml(urdfContent);

        // Store the information about the link and the objects indexed by link name
        Dictionary<string, XmlNode> xmlLinks = new Dictionary<string, XmlNode>();
        Dictionary<string, XmlNode> xmlJoints = new Dictionary<string, XmlNode>();

        // Indexed by joint name
        Dictionary<string, URDFJoint> urdfJoints = new Dictionary<string, URDFJoint>();
        Dictionary<string, URDFLink> urdfLinks = new Dictionary<string, URDFLink>();
        Dictionary<string, Material> urdfMaterials = new Dictionary<string, Material>();

        // Indexed by joint name
        Dictionary<string, string> parentNames = new Dictionary<string, string>();

        // First node is the <robot> node
        XmlNode robotNode = GetXmlNodeChildByName(doc, "robot");
        string robotName = robotNode.Attributes["name"].Value;

        XmlNode[] xmlLinksArray = GetXmlNodeChildrenByName(robotNode, "link");
        XmlNode[] xmlJointsArray = GetXmlNodeChildrenByName(robotNode, "joint");
        XmlNode[] xmlMaterialsArray = GetXmlNodeChildrenByName(robotNode, "material", true);

        foreach(XmlNode materialNode in xmlMaterialsArray) {

            if (materialNode.Attributes["name"] != null) {

                string materialName = materialNode.Attributes["name"].Value;
                if (!urdfMaterials.ContainsKey(materialName)) {

                    Material material = new Material(Shader.Find("Standard"));
                    Color color = Color.white;
                    XmlNode colorNode = GetXmlNodeChildByName(materialNode, "color");
                    if (colorNode != null) {

                        color = TupleToColor(colorNode.Attributes["rgba"].Value);

                    }
                    material.color = color;
                    urdfMaterials.Add(materialName, material);

                }


            }

        }

        // Cycle through the links and instantiate the geometry
        foreach (XmlNode linkNode in xmlLinksArray) {

            // Store the XML node for the link
            string linkName = linkNode.Attributes["name"].Value;
            xmlLinks.Add(linkName, linkNode);

            // create the link gameobject
            GameObject gameObject = new GameObject(linkName);
            URDFLink urdfLink = new URDFLink();
            urdfLink.name = linkName;
            urdfLink.transform = gameObject.transform;
            urdfLinks.Add(linkName, urdfLink);

            // Get the geometry node and skip it if there isn't one
            XmlNode[] visualNodesArray = GetXmlNodeChildrenByName(linkNode, "visual");
            List<GameObject> renderers = new List<GameObject>();
            urdfLink.geometry = renderers;

            // Iterate over all the visual nodes
            foreach (XmlNode xmlVisual in visualNodesArray) {

                XmlNode geomNode = GetXmlNodeChildByName(xmlVisual, "geometry");
                if (geomNode == null) {

                    continue;

                }

                Material material = null;
                XmlNode materialNode = GetXmlNodeChildByName(xmlVisual, "material");
                if (materialNode != null) {

                    if (materialNode.Attributes["name"] != null) {


                        string materialName = materialNode.Attributes["name"].Value;
                        material = urdfMaterials[materialName];

                    } else {

                        Color color = Color.white;
                        XmlNode colorNode = GetXmlNodeChildByName(materialNode, "color");
                        if (colorNode != null) {

                            color = TupleToColor(colorNode.Attributes["rgba"].Value);

                        }

                        material = new Material(Shader.Find("Standard"));
                        material.color = color;

                        // TODO: Load the textures
                        // XmlNode texNode = GetXmlNodeChildByName(materialNode, "texture");
                        // if (texNode != null) { }

                    }

                }

                // Get the mesh and the origin nodes
                XmlNode originNode = GetXmlNodeChildByName(xmlVisual, "origin");

                // Extract the position and rotation of the mesh
                Vector3 position = Vector3.zero;
                if (originNode != null && originNode.Attributes["xyz"] != null) {

                    position = TupleToVector3(originNode.Attributes["xyz"].Value);

                }
                position = URDFToUnityPos(position);

                Vector3 rotation = Vector3.zero;
                if (originNode != null && originNode.Attributes["rpy"] != null) {

                    rotation = TupleToVector3(originNode.Attributes["rpy"].Value);

                }
                rotation = URDFToUnityRot(rotation);

                XmlNode meshNode =
                    GetXmlNodeChildByName(geomNode, "mesh") ??
                    GetXmlNodeChildByName(geomNode, "box") ??
                    GetXmlNodeChildByName(geomNode, "sphere") ??
                    GetXmlNodeChildByName(geomNode, "cylinder");

                try {

                    if (meshNode.Name == "mesh") {

                        // Extract the mesh path
                        string fileName = ResolveMeshPath(meshNode.Attributes["filename"].Value, packages, options.workingPath);

                        // Extract the scale from the mesh node
                        Vector3 scale = Vector3.one;
                        if (meshNode.Attributes["scale"] != null) {

                            scale = TupleToVector3(meshNode.Attributes["scale"].Value);

                        }
                        scale = URDFToUnityScale(scale);

                        // load all meshes
                        string extension = Path.GetExtension(fileName).ToLower().Replace(".", "");
                        options.loadMeshCb(fileName, extension, models => {

                            // create the rest of the meshes and child them to the click target
                            for (int i = 0; i < models.Length; i++) {

                                GameObject modelGameObject = models[i];
                                Transform meshTransform = modelGameObject.transform;

                                // Capture the original local transforms before parenting in case the loader or model came in
                                // with existing pose information and then apply our transform on top of it.
                                Vector3 originalLocalPosition = meshTransform.localPosition;
                                Quaternion originalLocalRotation = meshTransform.localRotation;
                                Vector3 originalLocalScale = meshTransform.localScale;
                                Vector3 transformedScale = originalLocalScale;
                                transformedScale.x *= scale.x;
                                transformedScale.y *= scale.y;
                                transformedScale.z *= scale.z;

                                meshTransform.parent = urdfLink.transform;
                                meshTransform.localPosition = originalLocalPosition + position;
                                meshTransform.localRotation = Quaternion.Euler(rotation) * originalLocalRotation;
                                meshTransform.localScale = transformedScale;

                                modelGameObject.name = urdfLink.name + " geometry " + i;
                                renderers.Add(modelGameObject);

                                // allows the urdf parser to be called from editor scripts outside of runtime without throwing errors
                                // TODO: traverse over the children and do this
                                if (Application.isPlaying) {

                                    Destroy(meshTransform.GetComponent<Collider>());
                                    Destroy(meshTransform.GetComponent<Rigidbody>());

                                } else {

                                    DestroyImmediate(meshTransform.GetComponent<Collider>());
                                    DestroyImmediate(meshTransform.GetComponent<Rigidbody>());

                                }

                            }

                        });

                    } else {

                        // Instantiate the primitive geometry
                        XmlNode primitiveNode = meshNode;
                        GameObject primitiveGameObject = null;
                        Transform primitiveTransform = null;
                        switch (primitiveNode.Name) {

                            case "box": {

                                primitiveGameObject = GameObject.CreatePrimitive(PrimitiveType.Cube);
                                primitiveTransform = primitiveGameObject.transform;

                                Vector3 boxScale = TupleToVector3(primitiveNode.Attributes["size"].Value);
                                boxScale = URDFToUnityPos(boxScale);
                                primitiveTransform.localScale = boxScale;
                                break;

                            }

                            case "sphere": {

                                primitiveGameObject = GameObject.CreatePrimitive(PrimitiveType.Sphere);
                                primitiveTransform = primitiveGameObject.transform;

                                float sphereRadius = float.Parse(primitiveNode.Attributes["radius"].Value, CultureInfo.InvariantCulture);
                                primitiveTransform.localScale = Vector3.one * sphereRadius * 2;
                                break;

                            }

                            case "cylinder": {

                                primitiveGameObject = new GameObject();
                                primitiveTransform = primitiveGameObject.transform;

                                GameObject cylinderPrimitive = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                                cylinderPrimitive.transform.parent = primitiveTransform;

                                float length = float.Parse(primitiveNode.Attributes["length"].Value, CultureInfo.InvariantCulture);
                                float radius = float.Parse(primitiveNode.Attributes["radius"].Value, CultureInfo.InvariantCulture);
                                primitiveTransform.localScale = new Vector3(radius * 2, length / 2, radius * 2);
                                break;

                            }

                        }

                        // Position the transform
                        primitiveTransform.parent = urdfLink.transform;
                        primitiveTransform.localPosition = position;
                        primitiveTransform.localRotation = Quaternion.Euler(rotation);
                        primitiveGameObject.name = urdfLink.name + " geometry " + primitiveNode.Name;

                        Renderer primitiveRenderer = primitiveGameObject.GetComponent<Renderer>();
                        if (primitiveRenderer == null) {

                            primitiveRenderer = primitiveGameObject.GetComponentInChildren<Renderer>();

                        }

                        if (material != null) {

                            primitiveRenderer.material = material;

                        }
                        renderers.Add(primitiveGameObject);

                        // Dispose of unneeded components
                        if (Application.isPlaying) {

                            Destroy(primitiveRenderer.GetComponent<Collider>());
                            Destroy(primitiveRenderer.GetComponent<Rigidbody>());

                        } else {

                            DestroyImmediate(primitiveRenderer.GetComponent<Collider>());
                            DestroyImmediate(primitiveRenderer.GetComponent<Rigidbody>());

                        }

                    }

                } catch (Exception e) {

                    Debug.LogError("Error loading model for " + urdfLink.name + " : " + e.Message);

                }

            }

        }

        // Cycle through the joint nodes
        foreach (XmlNode jointNode in xmlJointsArray) {

            string jointName = jointNode.Attributes["name"].Value;

            // store the joints indexed by child name so we can find it later
            // to properly indicate the parents in the joint list
            xmlJoints.Add(jointName, jointNode);

            // Get the links by name
            XmlNode parentNode = GetXmlNodeChildByName(jointNode, "parent");
            XmlNode childNode = GetXmlNodeChildByName(jointNode, "child");
            string parentName = parentNode.Attributes["link"].Value;
            string childName = childNode.Attributes["link"].Value;
            URDFLink parentLink = urdfLinks[parentName];
            URDFLink childLink = urdfLinks[childName];

            // Create the joint
            GameObject jointGameObject = new GameObject(jointName);
            URDFJoint urdfJoint = new URDFJoint();
            urdfJoint.name = jointName;
            urdfJoint.parentLink = parentLink;
            urdfJoint.transform = jointGameObject.transform;
            urdfJoint.type = jointNode.Attributes["type"].Value;

            // Set the tree hierarchy
            // Parent the joint to its parent link
            urdfJoint.parentLink = parentLink;
            urdfJoint.transform.parent = parentLink.transform;
            parentLink.children.Add(urdfJoint);

            // Parent the child link to this joint
            urdfJoint.childLink = childLink;
            childLink.transform.parent = urdfJoint.transform;
            childLink.parent = urdfJoint;

            childLink.transform.localPosition = Vector3.zero;
            childLink.transform.localRotation = Quaternion.identity;

            // Position the origin if it's specified
            XmlNode transformNode = GetXmlNodeChildByName(jointNode, "origin");
            Vector3 position = Vector3.zero;
            if (transformNode != null && transformNode.Attributes["xyz"] != null) {

                position = TupleToVector3(transformNode.Attributes["xyz"].Value);

            }
            position = URDFToUnityPos(position);

            Vector3 rotation = Vector3.zero;
            if (transformNode != null && transformNode.Attributes["rpy"] != null) {

                rotation = TupleToVector3(transformNode.Attributes["rpy"].Value);

            }
            rotation = URDFToUnityRot(rotation);

            // parent the joint and name it
            urdfJoint.transform.localPosition = position;
            urdfJoint.transform.localRotation = Quaternion.Euler(rotation);
            urdfJoint.originalRotation = Quaternion.Euler(rotation);

            XmlNode axisNode = GetXmlNodeChildByName(jointNode, "axis");
            if (axisNode != null) {

                Vector3 axis = TupleToVector3(axisNode.Attributes["xyz"].Value);
                axis = URDFToUnityPos(axis);
                axis.Normalize();
                urdfJoint.axis = axis;

            }

            XmlNode limitNode = GetXmlNodeChildByName(jointNode, "limit");
            if (limitNode != null) {

                // Use double.parse to handle particularly large values.
                if (limitNode.Attributes["lower"] != null) {

                    urdfJoint.minAngle = (float)double.Parse(limitNode.Attributes["lower"].Value);

                }

                if (limitNode.Attributes["upper"] != null) {

                    urdfJoint.maxAngle = (float)double.Parse(limitNode.Attributes["upper"].Value);

                }

            }

            // save the URDF joint
            urdfJoints.Add(urdfJoint.name, urdfJoint);

        }

        // loop through all the transforms until we find the one that has no parent
        URDFRobot robot = options.target;
        foreach (KeyValuePair<string, URDFLink> kv in urdfLinks) {

            if (kv.Value.parent == null) {

                // find the top most node and add a joint list to it
                if (robot == null) {

                    robot = kv.Value.transform.gameObject.AddComponent<URDFRobot>();

                } else {

                    kv.Value.transform.parent = robot.transform;
                    kv.Value.transform.localPosition = Vector3.zero;
                    kv.Value.transform.localRotation = Quaternion.identity;

                }

                robot.links = urdfLinks;
                robot.joints = urdfJoints;

                robot.IsConsistent();
                return robot;

            }

        }
        robot.name = robotName;

        return null;

    }

    // Utilities
    // Default mesh loading function that can load STLs from file
    public static void LoadMesh(string path, string ext, Action<GameObject[]> done) {

        Mesh[] meshes = null;
        if (ext == "stl") {

            print("building stl file " + path);
            meshes = StlLoader.Load(path);

        } else {

            throw new Exception("Filetype '" + ext + "' not supported");

        }

        GameObject[] result = new GameObject[meshes.Length];
        for (int i = 0; i < meshes.Length; i++) {

            GameObject gameObject = GameObject.CreatePrimitive(PrimitiveType.Cube);
            Mesh mesh = meshes[i];
            Renderer renderer = gameObject.GetComponent<Renderer>();
            renderer.GetComponent<MeshFilter>().mesh = mesh;

            result[i] = gameObject;

        }

        done(result);

    }

    // Resolves the given mesh path with the package options and working paths to return
    // a full path to the mesh file.
    public static string ResolveMeshPath(string path, Dictionary<string, string> packages, string workingPath) {

        if (path.IndexOf("package://") != 0) {

            return Path.Combine(workingPath, path);

        }

        // extract the package name
        string[] split = path.Replace("package://", "").Split(new char[] { '/', '\\' }, 2);
        string targetPackage = split[0];
        string remaining = split[1];

        if (packages.ContainsKey(targetPackage)) {

            return Path.Combine(packages[targetPackage], remaining);

        } else if (packages.ContainsKey(SINGLE_PACKAGE_KEY)) {

            string packagePath = packages[SINGLE_PACKAGE_KEY];
            if (packagePath.EndsWith(targetPackage)) {

                return Path.Combine(packagePath, remaining);

            } else {

                return Path.Combine(
                    Path.Combine(packagePath, targetPackage),
                    remaining
                );

            }

        }

        Debug.LogError("URDFLoader: " + targetPackage + " not found in provided package list!");
        return null;

    }

    // returns the first instance of a child node with the name "name"
    // null if it couldn't be found
    public static XmlNode[] GetXmlNodeChildrenByName(XmlNode parent, string name, bool recursive = false) {

        List<XmlNode> nodes = new List<XmlNode>();
        foreach (XmlNode n in parent.ChildNodes) {

            if (n.Name == name) {

                nodes.Add(n);

            }


            if (recursive) {

                XmlNode[] recursiveChildren = GetXmlNodeChildrenByName(n, name, true);
                foreach(XmlNode x in recursiveChildren) {

                    nodes.Add(x);

                }

            }

        }

        return nodes.ToArray();

    }

    public static XmlNode GetXmlNodeChildByName(XmlNode parent, string name) {

        foreach (XmlNode n in parent.ChildNodes) {

            if (n.Name == name) {

                return n;

            }

        }

        return null;

    }

    // Converts a string of the form "x y z" into a Vector3
    public static Vector3 TupleToVector3(string str) {

        str = str.Trim();
        str = System.Text.RegularExpressions.Regex.Replace(str, "\\s+", " ");

        string[] numbers = str.Split(' ');

        Vector3 result = Vector3.zero;
        if (numbers.Length == 3) {

            try {

                result.x = float.Parse(numbers[0], CultureInfo.InvariantCulture);
                result.y = float.Parse(numbers[1], CultureInfo.InvariantCulture);
                result.z = float.Parse(numbers[2], CultureInfo.InvariantCulture);

            } catch (Exception e) {

                Debug.Log(str);
                Debug.LogError(e.Message);

            }

        }

        return result;

    }

    public static Color TupleToColor(string str) {

        str = str.Trim();
        str = System.Text.RegularExpressions.Regex.Replace(str, "\\s+", " ");

        string[] numbers = str.Split(' ');
        Color result = new Color();
        if (numbers.Length == 4) {

            try {
                result.r = float.Parse(numbers[0], CultureInfo.InvariantCulture);
                result.g = float.Parse(numbers[1], CultureInfo.InvariantCulture);
                result.b = float.Parse(numbers[2], CultureInfo.InvariantCulture);
                result.a = float.Parse(numbers[3], CultureInfo.InvariantCulture);

            } catch (Exception e) {

                Debug.Log(str);
                Debug.LogError(e.Message);

            }

        }

        return result;

    }

    // URDF
    // Y left
    // Z up
    // X forward

    // Unity
    // X right
    // Y up
    // Z forward
    public static Vector3 URDFToUnityPos(Vector3 v) {

        return new Vector3(-v.y, v.z, v.x);

    }

    public static Vector3 URDFToUnityScale(Vector3 v) {

        return new Vector3(v.y, v.z, v.x);

    }

    // URDF
    // Fixed Axis rotation, XYZ
    // roll on X
    // pitch on Y
    // yaw on Z
    // radians

    // Unity
    // roll on Z
    // yaw on Y
    // pitch on X
    // degrees

    // takes radians, returns degrees
    public static Vector3 URDFToUnityRot(Vector3 v) {

        // Negate X and Z because we're going from Right to Left handed rotations. Y is handled because the axis itself is flipped
        v.x *= -1;
        v.z *= -1;
        v *= Mathf.Rad2Deg;

        // swap the angle values
        v = new Vector3(v.y, v.z, v.x);

        // Applying rotations in ZYX ordering, as indicated above
        Quaternion q = Quaternion.identity;

        q *= Quaternion.Euler(0, v.y, 0);
        q *= Quaternion.Euler(v.x, 0, 0);
        q *= Quaternion.Euler(0, 0, v.z);

        // The following rotation is the same as the previous rotations in order
        //q = Quaternion.Euler(v.y, v.z, v.x);

        return q.eulerAngles;

    }

}
