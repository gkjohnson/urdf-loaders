using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEditor;
using System.Text.RegularExpressions;

[CustomEditor(typeof(URDFJointList))]
public class URDFJointListEditor : Editor {
    List<string> _list = new List<string>();
    bool _useDeg = true;
    bool _sort = true;
    string _filter = "";
    public override void OnInspectorGUI() {

        URDFJointList ujl = (URDFJointList)target;

        // Options
        EditorGUILayout.LabelField("Options", EditorStyles.boldLabel);
        _useDeg = EditorGUILayout.Toggle("Edit in Degrees", _useDeg);
        _sort = EditorGUILayout.Toggle("Sort Alphabetically", _sort);
        _filter = EditorGUILayout.TextField("Filter", _filter);
        
        // Get the joints as a list so we can srot
        _list.Clear();
        _list.AddRange(ujl.joints.Keys);
        if (_sort) _list.Sort();

        // Joints
        EditorGUILayout.Space();
        EditorGUILayout.LabelField("Joints", EditorStyles.boldLabel);
        Regex re = new Regex(_filter, RegexOptions.ECMAScript | RegexOptions.IgnoreCase);
        foreach (string key in _list) {
            // If we don't match the regex, don't display this field
            if (_filter != "" && !re.IsMatch(key)) continue;

            // Display the joint fields
            EditorGUI.BeginChangeCheck();
            float angle = ujl.joints[key].angle * (_useDeg ? Mathf.Rad2Deg : 1);
            float newAngle = EditorGUILayout.FloatField(key, angle);
            if (EditorGUI.EndChangeCheck()) {
                newAngle *= (_useDeg ? Mathf.Deg2Rad : 1);
                ujl.SetAngle(key, newAngle);
            }
        }
    }

    public override bool RequiresConstantRepaint() {
        return true;
    }
}
