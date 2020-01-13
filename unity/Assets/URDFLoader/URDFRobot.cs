using UnityEngine;
using System.Collections.Generic;

// Component representing the URDF Robot
public class URDFRobot : MonoBehaviour {

    // Object describing a URDF joint with joint transform, associated geometry, etc
    public class URDFJoint {

        public string name;
        public URDFLink parentLink;
        public URDFLink childLink;

        public string type = "fixed";
        public Vector3 axis = Vector3.zero;
        public float minAngle = 0;
        public float maxAngle = 0;

		public Transform transform;
        public Quaternion originalRotation;

        public List<GameObject> geometry { get { return childLink.geometry; } }

        private float _angle = 0;
        public float angle {

            get { return _angle; }

            set { setAngle(value); }

        }

        public float setAngle(float val) {

            switch(type) {

                case "fixed": {

                    break;

                }

                case "continuous":
                case "revolute": {

                    if (type == "revolute") {

                        val = Mathf.Clamp(val, minAngle, maxAngle);

                    }

                    // Negate to accommodate Right -> Left handed coordinate system
                    float degrees = angle * Mathf.Rad2Deg * -1;
                    transform.localRotation = Quaternion.AngleAxis(degrees, originalRotation * axis) * originalRotation;
                    _angle = val;

                    break;

                }

                case "prismatic":
                case "floating":
                case "planar": {

                    Debug.LogWarning("URDFLoader: '" + type + "' joint not yet supported");
                    break;

                }

            }

            return _angle;

        }

    }

    // Object discribing a URDF Link
    public class URDFLink {

        public string name;

        public URDFJoint parent;
        public List<URDFJoint> children = new List<URDFJoint>();

        public Transform transform;
        public List<GameObject> geometry;

    }

    // Dictionary containing all the URDF joints
    public Dictionary<string, URDFJoint> joints = new Dictionary<string, URDFJoint>();
    public Dictionary<string, URDFLink> links = new Dictionary<string, URDFLink>();

    // adds a joint via URDFJoint
    public bool AddJoint( URDFJoint joint ) {

        if (!joints.ContainsKey(joint.name)) {

            joints.Add(joint.name, joint);
            return true;

        }
        return false;

    }

    // Adds the URDFLink to the list
    public bool AddLink(URDFLink link) {

        if (!links.ContainsKey(link.name)) {

            links.Add(link.name, link);
            return true;

        }
        return false;

    }

    // Set the angle of a joint
    public void SetAngle(string name, float angle) {

        URDFJoint joint = joints[name];
        joint.setAngle(angle);

    }

    // Sets the angle if it can, returns false otherwise
    public bool TrySetAngle(string name, float angle) {

        if (!joints.ContainsKey(name)) {

            return false;

        }

        SetAngle(name, angle);
        return true;

    }

    // get and set the joint angles as dictionaries
    public Dictionary<string, float> GetAnglesAsDictionary() {

		Dictionary<string, float> result = new Dictionary<string, float>();
        foreach (KeyValuePair<string, URDFJoint> kv in joints) {

            float angle = kv.Value.angle;
            if (result.ContainsKey(kv.Key)) {

                result[kv.Key] = angle;

            } else {

                result.Add(kv.Key, angle);

            }

        }

        return result;

    }

    // sets the joints via a dictionary
    public void SetAnglesFromDictionary(Dictionary<string, float> dict) {

        foreach (KeyValuePair<string, float> kv in dict) {

            if (joints.ContainsKey(kv.Key)) {

                joints[kv.Key].setAngle(kv.Value);

            }

        }

    }

    // Validates the structure of the links and joints to verify that everything
    // is consistant. Does not validate Unity's transform hierarchy or verify that
    // there are no cycles.
    public bool IsConsistent() {

        string error = "";
        bool success = IsConsistent(ref error);
        if (!success) {

            Debug.LogError("URDFLoader: Inconsistent URDF Structure\n" + error);

        }
        return success;

    }

    // Validates the consistency of the URDF structure
    public bool IsConsistent(ref string errorMsg) {

        errorMsg = "";

        // verify that
        // * every joint's name matches its key
        // * every joint specifies a joint type
        // * both parent and child match
        foreach( KeyValuePair<string, URDFJoint> kv in joints ) {

            URDFJoint j = kv.Value;

            if (j.name != kv.Key) {

                errorMsg = string.Format("Joint \"{0}'s\" name does not match key \"{1}\"", j.name, kv.Key);
                return false;

            }

            if (j.type == "") {

                errorMsg = string.Format("Joint \"{0}'s\" type is not set", j.name);
                return false;

            }

            if (j.parentLink == null) {

                errorMsg = string.Format("Joint \"{0}\" does not have a parent link", j.name);
                return false;

            }

            if (!j.parentLink.children.Contains(j)) {

                errorMsg = string.Format("Joint \"{0}'s\" parent link \"{1}\" does not contain it as a child", j.name, j.parentLink.name);
                return false;

            }

            if (j.childLink == null) {

                errorMsg = string.Format("Joint \"{0}\" does not have a child link", j.name);
                return false;

            }

            if (j.childLink.parent != j) {

                errorMsg = string.Format("Joint \"{0}'s\" child link \"{1}\" does not have it as a parent", j.name, j.childLink.name);
                return false;

            }

        }

        // verify that
        // * every link's name matches it key
        // * every parent and child matches
        foreach (KeyValuePair<string, URDFLink> kv in links) {

            URDFLink l = kv.Value;

            if (l.name != kv.Key) {

                errorMsg = string.Format("Link \"{0}'s\" name does not match key \"{1}\"", l.name, kv.Key);
                return false;

            }

            if (l.parent != null && l.parent.childLink != l) {

                errorMsg = string.Format("Link \"{0}'s\" parent joint \"{1}\" does not have it as a child", l.name, l.parent.name);
                return false;

            }

            foreach (URDFJoint j in l.children) {

                if (j.parentLink != l) {

                    errorMsg = string.Format("Link \"{0}'s\" child joint \"{1}\" does not have it as a parent", l.name, j.name);
                    return false;

                }

            }

        }

        return true;
    }

}
