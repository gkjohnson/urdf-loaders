using UnityEngine;
using System.IO;

public class LoadRobot : MonoBehaviour {
    enum Axis {
        POS_X = 1,
        POS_Y = 2,
        POS_Z = 3,
        NEG_X = -1,
        NEG_Y = -2,
        NEG_Z = -3
    }

    [SerializeField]
    string _packagePath = "";

    [SerializeField]
    string _fileName = "";

    [SerializeField]
    Axis _upAxis = Axis.POS_Y;

    public URDFJointList robot;

    void Awake() {
        string path = Application.dataPath + _packagePath;
        robot = CreateRobot(path, _fileName);

        bool positive = _upAxis > 0;
        Axis axis = !positive ? (Axis)(-1 * (int)_upAxis) : _upAxis;
        Vector3 angles = Vector3.zero;

        if (axis == Axis.POS_X) angles.z = positive ? 90 : -90;
        if (axis == Axis.POS_Z) angles.x = positive ? 90 : -90;
        if (axis == Axis.POS_Y) angles.x = positive ? 0 : 180;

        robot.transform.rotation = Quaternion.Euler(angles);
    }

    URDFJointList CreateRobot(string package, string urdf) {
        StreamReader reader = new StreamReader(package + urdf);
        string content = reader.ReadToEnd();
        
        var res = Resources.Load<TextAsset>("r2_description/robots/r2b.urdf");
        Debug.Log(res.text);

        URDFJointList ujl = URDFParser.BuildRobot("", res.text, (path, done) => {

            // Load the dae model
            GameObject dae = Resources.Load<GameObject>(path.Substring(0, path.Length - 4));
            dae = Instantiate(dae);

            GameObject go = new GameObject();
            go.transform.position = Vector3.zero;
            go.transform.rotation = Quaternion.identity;
            dae.transform.parent = go.transform;

            dae.transform.rotation = Quaternion.Euler(-90, 0, 90);

            Debug.Log(go.transform.position);
            done(new GameObject[] { go });

        });
        
        //URDFJointList ujl = URDFParser.BuildRobot(package, content);
        //ujl.name = urdf;

        return ujl;
    }

    void Update() {
        return;
        float time = Time.timeSinceLevelLoad * 1000.0f / 3e2f;
        for(int i = 1; i <= 6; i ++) {
            float offset = i * Mathf.PI / 3;
            float ratio = Mathf.Max(0, Mathf.Sin(time + offset));

            robot.SetAngle("HP" + i, Mathf.Lerp(30, 0, ratio) * Mathf.Deg2Rad);
            robot.SetAngle("KP" + i, Mathf.Lerp(90, 150, ratio) * Mathf.Deg2Rad);
            robot.SetAngle("AP" + i, Mathf.Lerp(-30, -60, ratio) * Mathf.Deg2Rad);
        }
    }

}
