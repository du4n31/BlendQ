import json
import bpy


def inspect_project():
    scenes = []

    for scene in bpy.data.scenes:
        scenes.append(
            {
                "name": scene.name,
                "frameStart": scene.frame_start,
                "frameEnd": scene.frame_end,
                "frameStep": scene.frame_step,
            }
        )

    result = {
        "scenes": scenes,
    }

    print("BLENDQ_INSPECTION_RESULT=" + json.dumps(result))


if __name__ == "__main__":
    inspect_project()