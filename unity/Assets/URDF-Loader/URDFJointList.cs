using UnityEngine;
using System.Collections.Generic;

// A Joint list for URDF robots 
public class URDFJointList : MonoBehaviour {

    // an object describing a URDF joint (joint transform, associated geometry, more?)
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

        // Set the rotation of the joint in radians
        private float _angle = 0;
        public float angle {
            get { return _angle; }
            set {
                _angle = Mathf.Clamp(value, minAngle, maxAngle);

                transform.localRotation = Quaternion.AngleAxis(angle * Mathf.Rad2Deg, originalRotation * axis) * originalRotation;
            }
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

    // dictionary containing all the URDF joints
    public Dictionary<string, URDFJoint> joints = new Dictionary<string, URDFJoint>();
    public Dictionary<string, URDFLink> links = new Dictionary<string, URDFLink>();

    // adds a joint via URDFJoint
    public bool AddJoint( URDFJoint urdfj ) {
        if (!joints.ContainsKey(urdfj.name))
        {
            joints.Add(urdfj.name, urdfj);
            return true;
        }
        return false;
    }

    // Adds the URDFLink to the list
    public bool AddLink(URDFLink urdfl) {
        if (!links.ContainsKey(urdfl.name))
        {
            links.Add(urdfl.name, urdfl);
            return true;
        }
        return false;
    }

    // Set the angle of a joint
    public void SetAngle(string name, float angle) {
        URDFJoint joint = joints[name];
        joint.angle = angle;
    }

    // Sets the angle if it can, returns false otherwise
    public bool TrySetAngle(string name, float angle) {
        if (!joints.ContainsKey(name)) return false;

        SetAngle(name, angle);
        return true;
    }

    // get and set the joint angles as dictionaries
    public Dictionary<string, float> GetAnglesAsDictionary() {
		Dictionary<string, float> angleDict = new Dictionary<string, float>();
        foreach (KeyValuePair<string, URDFJoint> kv in joints)
        {
            float angle = kv.Value.angle;
            if (angleDict.ContainsKey(kv.Key)) angleDict[kv.Key] = angle;
            else angleDict.Add(kv.Key, angle);
        }

        return angleDict;
    }

    // sets the joints via a dictionary
    public void SetAnglesFromDictionary(Dictionary<string, float> dict) {
		if( dict == null ) return;
        foreach (KeyValuePair<string, float> kv in dict) {
            if (joints.ContainsKey(kv.Key)) joints[kv.Key].angle = kv.Value;
        }
    }

    // Validates the structure of the links and joints to verify that everything
    // is consistant. Does not validate Unity's transform hierarchy or verify that
    // there are no cycles.
    public bool IsConsistent() {
        string error = "";
        bool success = IsConsistent(ref error);
        if (!success) {
            Debug.LogError("Inconsistent URDF Structure\n" + error);
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
        foreach( KeyValuePair<string, URDFJoint> kv in joints )
        {
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