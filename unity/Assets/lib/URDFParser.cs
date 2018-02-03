using UnityEngine;
using System.Collections.Generic;
using System.Xml;
using System.IO;

using URDFJoint = URDFJointList.URDFJoint;
using URDFLink = URDFJointList.URDFLink;

public class URDFParser : MonoBehaviour {
    // Default mesh loading function that can
    // load STLs from file
    public static void LoadMesh(string path, System.Action<Mesh[]> done) {
        string fileType = Path.GetExtension(path).ToLower().Replace(".", "");
        if (fileType == "stl") {
            done(StlLoader.Load(path));
        } else {
            throw new System.Exception("Filetype '" + fileType + "' not supported");
        }
    }

    // Load the URDF from file and build the robot
    public static URDFJointList LoadURDFRobot(string package, string urdfpath, System.Action<string, System.Action<Mesh[]>> loadMesh = null, URDFJointList urdfjointlist = null) {
        string path = Path.Combine(package, urdfpath);
        StreamReader reader = new StreamReader(path);
        string content = reader.ReadToEnd();

        return BuildRobot(package, content, loadMesh, urdfjointlist);
    }

    // create the robot
    public static URDFJointList BuildRobot(string package, string urdfContent, System.Action<string, System.Action<Mesh[]>> loadMesh = null, URDFJointList urdfjointlist = null) {
        if (loadMesh == null) loadMesh = LoadMesh;

        // load the XML doc
        XmlDocument doc = new XmlDocument();
        doc.LoadXml(urdfContent);

        // Store the information about the link and the objects
        // indexed by link name
        Dictionary<string, XmlNode> xmlLinks = new Dictionary<string, XmlNode>();
        Dictionary<string, XmlNode> xmlJoints = new Dictionary<string, XmlNode>();

        // indexed by joint name
        Dictionary<string, URDFJoint> urdfJoints = new Dictionary<string, URDFJoint>();
        Dictionary<string, URDFLink> urdfLinks = new Dictionary<string,URDFLink>();

        // first node is the robot node (for the full robot)
        foreach(XmlNode n in doc.ChildNodes) {
            // first node is expected to be the robot
            // cycle through and find all the links for the robot first
            foreach(XmlNode xLink in n.ChildNodes) {
                if( xLink.Name == "link" ) {
                    // Store the XML node for hte link
                    xmlLinks.Add( xLink.Attributes["name"].Value , xLink );

                    // create the link gameobject
                    URDFLink urdfLink = new URDFLink();
                    urdfLink.name = xLink.Attributes["name"].Value;
                    urdfLink.transform = new GameObject(urdfLink.name).transform;
                    urdfLinks.Add(urdfLink.name, urdfLink);

                    // Get the geometry node and skip it if there isn't one
                    XmlNode[] visualNodes = GetXmlNodeChildrenByName(xLink, "visual");
                    List<Renderer> renderers = new List<Renderer>();

                    // Iterate over all the visual nodes
                    foreach (var vn in visualNodes) {
                        XmlNode geomNode = GetXmlNodeChildByName(vn, "geometry");
                        if (geomNode == null) continue;

                        XmlNode matNode = GetXmlNodeChildByName(vn, "material");
                        Color col = Color.white;
                        if(matNode != null) {
                            XmlNode colNode = GetXmlNodeChildByName(matNode, "color");
                            if (colNode != null) col = TupleToColor(colNode.Attributes["rgba"].Value);

                            // TODO: Load the textures
                            XmlNode texNode = GetXmlNodeChildByName(matNode, "texture");
                            if (texNode != null) { }
                        }

                        // Get the mesh and the origin nodes
                        // TODO: Handle boxes, spheres, and cylinders here
                        XmlNode meshNode = GetXmlNodeChildByName(geomNode, "mesh");
                        XmlNode visOriginNode = GetXmlNodeChildByName(vn, "origin");
                        
                        // take the visual origin and place on the renderer
                        // use the visual origin to set the pose if necessary
                        Vector3 visPos = Vector3.zero;
                        if (visOriginNode != null && visOriginNode.Attributes["xyz"] != null) {
                            visPos = TupleToVector3(visOriginNode.Attributes["xyz"].Value);
                        }
                        visPos = URDFToUnityPos(visPos);

                        Vector3 visRot = Vector3.zero;
                        if (visOriginNode != null && visOriginNode.Attributes["rpy"] != null) {
                            visRot = TupleToVector3(visOriginNode.Attributes["rpy"].Value);
                        }
                        visRot = URDFToUnityRot(visRot);
                        
                        // load the STL file if possible
                        try {
                            // get the file path and split it
                            string fileName = meshNode.Attributes["filename"].Value;
                            fileName = Path.Combine(package, fileName.Replace("package://", ""));
                            
                            // load all meshes 
                            loadMesh(fileName, meshes => {
                                if (meshes.Length > 0) {
                                    // create the rest of the meshes and child them to the click target
                                    for (int i = 0; i < meshes.Length; i++)
                                    {
                                        Renderer r = GameObject.CreatePrimitive(PrimitiveType.Cube).GetComponent<Renderer>();
                                        r.GetComponent<MeshFilter>().mesh = meshes[i];

                                        r.transform.parent = urdfLink.transform;
                                        r.transform.localPosition = visPos;
                                        r.transform.localRotation = Quaternion.Euler(visRot);

                                        r.name = urdfLink.name + " geometry " + i;
                                        r.material.color = col;

                                        renderers.Add(r);

                                        Destroy(r.GetComponent<Collider>());
                                        Destroy(r.GetComponent<Rigidbody>());
                                    }
                                }
                            });

                            // save the geometry in the link
                            urdfLink.geometry = renderers;
                        } catch (System.Exception e) {
                            Debug.LogError("Error loading model for " + urdfLink.name + " : " + e.Message);
                        }
                    }
                }
            }

            // find all the joints next
            foreach(XmlNode xJoint in n.ChildNodes) {
                if(xJoint.Name == "joint") {
                    string jointName = xJoint.Attributes["name"].Value;

                    // store the joints indexed by child name so we can find it later
                    // to properly indicate the parents in the joint list
                    xmlJoints.Add(jointName, xJoint);

                    // Get the links by name
                    URDFLink parentLink = urdfLinks[GetXmlNodeChildByName(xJoint, "parent").Attributes["link"].Value];
                    URDFLink childLink = urdfLinks[GetXmlNodeChildByName(xJoint, "child").Attributes["link"].Value];

                    // Create the joint
                    URDFJoint urdfJoint = new URDFJoint();
                    urdfJoint.name = jointName;
                    urdfJoint.parentLink = parentLink;
                    urdfJoint.transform = new GameObject(urdfJoint.name).transform;
                    urdfJoint.type = xJoint.Attributes["type"].Value;

                    // set the tree hierarchy
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
                    
                    // position the origin if it's specified
                    XmlNode transNode = GetXmlNodeChildByName(xJoint, "origin");
                    Vector3 pos = Vector3.zero;
                    if(transNode != null && transNode.Attributes["xyz"] != null) {
                        pos = TupleToVector3(transNode.Attributes["xyz"].Value);
                    }
                    pos = URDFToUnityPos(pos);

                    Vector3 rot = Vector3.zero;
                    if(transNode != null && transNode.Attributes["rpy"] != null) {
                        rot = TupleToVector3(transNode.Attributes["rpy"].Value);
                    }
                    rot = URDFToUnityRot(rot);

                    // parent the joint and name it
                    urdfJoint.transform.localPosition = pos;
                    urdfJoint.transform.localRotation = Quaternion.Euler(rot);
                    urdfJoint.originalRotation = urdfJoint.transform.localRotation;

                    XmlNode axisNode = GetXmlNodeChildByName(xJoint, "axis");
                    if (axisNode != null) {
                        Vector3 axis = TupleToVector3(axisNode.Attributes["xyz"].Value);
                        axis.Normalize();
                        axis = URDFToUnityPos(axis);
                        urdfJoint.axis = axis;
                    }

                    XmlNode limitNode = GetXmlNodeChildByName(xJoint, "limit");
                    if (limitNode != null) {
                        if (limitNode.Attributes["lower"] != null) urdfJoint.minAngle = float.Parse(limitNode.Attributes["lower"].Value);
                        if (limitNode.Attributes["upper"] != null) urdfJoint.maxAngle = float.Parse(limitNode.Attributes["upper"].Value);
                    }

                    // save the URDF joint
                    urdfJoints.Add(urdfJoint.name, urdfJoint);
                }
            }
        }
        
        // loop through all the transforms until we find the one that has no parent
        foreach(KeyValuePair<string,URDFLink> kv in urdfLinks) {
            // TODO : if there are multiple robots described, then we'll only be getting
            // the one. Should update to return a list of jointlists if necessary
            if (kv.Value.parent == null) {
                // find the top most node and add a joint list to it
                if (urdfjointlist == null) {
                    urdfjointlist = kv.Value.transform.gameObject.AddComponent<URDFJointList>();
                } else {
                    kv.Value.transform.parent = urdfjointlist.transform;
                    kv.Value.transform.localPosition = Vector3.zero;
                    kv.Value.transform.localRotation = Quaternion.identity;
                }
                urdfjointlist.links = urdfLinks;
                urdfjointlist.joints = urdfJoints;

                urdfjointlist.IsConsistent();
                return urdfjointlist;
            }
        }
        return null;
    }

    // returns the first instance of a child node with the name "name"
    // null if it couldn't be found
    public static XmlNode[] GetXmlNodeChildrenByName(XmlNode parent, string name) {
        if( parent == null ) return null;

        List<XmlNode> nodes = new List<XmlNode>();
        foreach(XmlNode n in parent.ChildNodes ) {
            if (n.Name == name)
                nodes.Add(n);
        }

        return nodes.ToArray();
    }

    public static XmlNode GetXmlNodeChildByName(XmlNode parent, string name) {
        if (parent == null) return null;

        foreach (XmlNode n in parent.ChildNodes) {
            if (n.Name == name)
                return n;
        }

        return null;
    }

    // Converts a string of the form "x y z" into a Vector3
    public static Vector3 TupleToVector3(string s) {
        s = s.Trim();
        s = System.Text.RegularExpressions.Regex.Replace(s, "\\s+", " ");

        string[] nums = s.Split(' ');
        
        Vector3 v = Vector3.zero;
        if (nums.Length == 3) {
            try {
                v.x = float.Parse(nums[0]);
                v.y = float.Parse(nums[1]);
                v.z = float.Parse(nums[2]);
            } catch (System.Exception e) {
                Debug.Log(s);
                Debug.LogError(e.Message);
            }
        }

        return v;
    }

    public static Color TupleToColor(string s) {
        s = s.Trim();
        s = System.Text.RegularExpressions.Regex.Replace(s, "\\s+", " ");

        string[] nums = s.Split(' ');
        Color c = new Color();
        if (nums.Length == 4) {
            try {
                c.r = float.Parse(nums[0]);
                c.g = float.Parse(nums[1]);
                c.b = float.Parse(nums[2]);
                c.a = float.Parse(nums[3]);
            } catch (System.Exception e) {
                Debug.Log(s);
                Debug.LogError(e.Message);
            }
        }

        return c;
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
        v = new Vector3( v.y, v.z, v.x );

        // Applying rotations in ZYX ordering, as indicated above
        Quaternion q = Quaternion.identity;

        q *= Quaternion.Euler(0, v.y, 0); 
        q *= Quaternion.Euler(v.x, 0, 0);
        q *= Quaternion.Euler(0, 0, v.z);
        
        return q.eulerAngles;
    }
}
