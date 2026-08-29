import json

import bpy


RESULT_PREFIX = "BLENDQ_INSPECTION_RESULT="


def inspect_file_output(node) -> dict:
    file_format = node.format.file_format

    return {
        "name": node.name,
        "directory": getattr(node, "directory", ""),
        "fileName": getattr(node, "file_name", ""),
        "fileFormat": file_format,
        "isMultilayer": file_format == "OPEN_EXR_MULTILAYER",
        "items": [
            {
                "name": item.name,
            }
            for item in node.file_output_items
        ],
    }


def inspect_compositor(scene) -> dict:
    node_tree = getattr(scene, "compositing_node_group", None)

    if node_tree is None:
        return {
            "enabled": bool(scene.render.use_compositing),
            "fileOutputs": [],
        }

    file_outputs = [
        inspect_file_output(node)
        for node in node_tree.nodes
        if node.type == "OUTPUT_FILE"
    ]

    return {
        "enabled": bool(scene.render.use_compositing),
        "fileOutputs": file_outputs,
    }


def inspect_scene(scene) -> dict:
    return {
        "name": scene.name,
        "frameStart": scene.frame_start,
        "frameEnd": scene.frame_end,
        "frameStep": scene.frame_step,
        "renderEngine": scene.render.engine,
        "resolution": {
            "width": scene.render.resolution_x,
            "height": scene.render.resolution_y,
            "percentage": scene.render.resolution_percentage,
        },
        "sceneOutput": {
            "filepath": scene.render.filepath,
            "fileFormat": scene.render.image_settings.file_format,
        },
        "compositor": inspect_compositor(scene),
    }


result = {
    "blenderVersion": bpy.app.version_string,
    "scenes": [
        inspect_scene(scene)
        for scene in bpy.data.scenes
    ],
}

print(RESULT_PREFIX + json.dumps(result))