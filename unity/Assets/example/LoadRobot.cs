using UnityEngine;
using System.IO;
using System.Collections.Generic;
using System;

public class LoadRobot : MonoBehaviour {
    enum Axis {
        POS_X = 1,
        POS_Y = 2,
        POS_Z = 3,
        NEG_X = -1,
        NEG_Y = -2,
        NEG_Z = -3
    }

    [Serializable]
    struct Package {
        public string name;
        public string path;
    }
    
    [SerializeField]
    List<Package> _packages;

    [SerializeField]
    string _fileName = "";

    [SerializeField]
    Axis _upAxis = Axis.POS_Y;

    public URDFRobot robot;

    void Awake() {

        Dictionary<string, string> packages = new Dictionary<string, string>();
        foreach (var pkg in _packages) {

            string packagePath = pkg.path;
            if (packagePath.IndexOf("https://") != 0 && packagePath.IndexOf("https://") != 0) {
                packagePath = Path.Combine(Application.dataPath, packagePath);
            }
            packages[pkg.name] = packagePath;

        }

        string urdfPath = _fileName;
        if (urdfPath.IndexOf("https://") != 0 && urdfPath.IndexOf("https://") != 0) {
            urdfPath = Path.Combine(Application.dataPath, urdfPath);
        }
        robot = CreateRobot(urdfPath, packages);

        bool positive = _upAxis > 0;
        Axis axis = !positive ? (Axis)(-1 * (int)_upAxis) : _upAxis;
        Vector3 angles = Vector3.zero;

        if (axis == Axis.POS_X) angles.x = positive ? 90 : -90;
        if (axis == Axis.POS_Y) angles.z = positive ? -90 : 90;
        if (axis == Axis.POS_Z) angles.x = positive ? 0 : 180;

        robot.transform.rotation = Quaternion.Euler(angles);
    }

    virtual protected URDFRobot CreateRobot(string urdf, Dictionary<string, string> packages) {

        URDFRobot ur = URDFLoader.Load(urdf, packages, options);
        ur.name = urdf;

        return ur;
    }

    virtual protected void Update() {
        float time = Time.timeSinceLevelLoad * 1000.0f / 3e2f;
        for(int i = 1; i <= 6; i ++) {
            float offset = i * Mathf.PI / 3;
            float ratio = Mathf.Max(0, Mathf.Sin(time + offset));

            robot.TrySetAngle("HP" + i, Mathf.Lerp(30, 0, ratio) * Mathf.Deg2Rad);
            robot.TrySetAngle("KP" + i, Mathf.Lerp(90, 150, ratio) * Mathf.Deg2Rad);
            robot.TrySetAngle("AP" + i, Mathf.Lerp(-30, -60, ratio) * Mathf.Deg2Rad);

            robot.TrySetAngle("TC" + i + "A", Mathf.Lerp(0, 0.065f, ratio));
            robot.TrySetAngle("TC" + i + "B", Mathf.Lerp(0, 0.065f, ratio));

            robot.TrySetAngle("W" + i, Time.realtimeSinceStartup * 0.000001f);
        }
    }

}
