import json
import re
import sys
from pathlib import Path

import bpy


PROTOCOL_PREFIX = "BLENDQ:"

OUTPUT_MODE_SCENE = "scene-output"
OUTPUT_MODE_COMPOSITOR = "compositor-file-outputs"


def main() -> None:
    try:
        args = _parse_args(sys.argv)

        scene_name = _require_arg(args, "scene")
        frame = int(_require_arg(args, "frame"))
        output_mode = _require_arg(args, "output-mode")
        output_dir = Path(_require_arg(args, "output-dir")).resolve()

        scene = bpy.data.scenes.get(scene_name)

        if scene is None:
            raise ValueError(f'Scene "{scene_name}" does not exist.')

        if output_mode not in {
            OUTPUT_MODE_SCENE,
            OUTPUT_MODE_COMPOSITOR,
        }:
            raise ValueError(
                f'Unsupported output mode "{output_mode}".'
            )

        output_dir.mkdir(parents=True, exist_ok=True)

        scene.frame_set(frame)

        _emit(
            {
                "type": "render-started",
                "scene": scene.name,
                "frame": frame,
                "outputMode": output_mode,
            }
        )

        if output_mode == OUTPUT_MODE_SCENE:
            _configure_scene_output(
                scene=scene,
                frame=frame,
                output_dir=output_dir,
            )
        else:
            _configure_compositor_outputs(
                scene=scene,
                output_dir=output_dir,
            )

        bpy.context.window.scene = scene

        bpy.ops.render.render(
            write_still=output_mode == OUTPUT_MODE_SCENE,
            scene=scene.name,
        )

        output_files = _find_output_files(output_dir)

        for output_file in output_files:
            _emit(
                {
                    "type": "output-saved",
                    "scene": scene.name,
                    "frame": frame,
                    "path": str(output_file),
                }
            )

        _emit(
            {
                "type": "frame-completed",
                "scene": scene.name,
                "frame": frame,
                "outputCount": len(output_files),
            }
        )

        _emit(
            {
                "type": "render-completed",
                "scene": scene.name,
                "frame": frame,
            }
        )

    except Exception as error:
        _emit(
            {
                "type": "error",
                "message": str(error),
            }
        )

        raise


def _configure_scene_output(
    scene: bpy.types.Scene,
    frame: int,
    output_dir: Path,
) -> None:
    scene.render.use_compositing = False
    scene.render.use_file_extension = True

    scene.render.filepath = str(
        output_dir / f"scene_output_{frame:06d}"
    )


def _configure_compositor_outputs(
    scene: bpy.types.Scene,
    output_dir: Path,
) -> None:
    scene.render.use_compositing = True

    node_tree = getattr(
        scene,
        "compositing_node_group",
        None,
    )

    if node_tree is None:
        raise RuntimeError(
            "The selected scene does not have a compositor node tree."
        )

    file_output_nodes = [
        node
        for node in node_tree.nodes
        if node.type == "OUTPUT_FILE"
    ]

    if not file_output_nodes:
        raise RuntimeError(
            "The selected scene does not contain any File Output nodes."
        )

    # Prevent the normal scene output from being written alongside
    # compositor outputs.
    discard_dir = output_dir / "_scene_output"
    discard_dir.mkdir(parents=True, exist_ok=True)

    scene.render.filepath = str(
        discard_dir / "_render_result_"
    )

    for index, node in enumerate(file_output_nodes):
        _configure_file_output_node(
            node=node,
            index=index,
            output_dir=output_dir,
        )


def _configure_file_output_node(
    node,
    index: int,
    output_dir: Path,
) -> None:
    safe_node_name = _safe_name(node.name)

    node_output_dir = (
        output_dir
        / f"{index + 1:02d}_{safe_node_name}"
    )

    node_output_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    node.directory = str(node_output_dir)

    file_format = getattr(
        node.format,
        "file_format",
        "",
    )

    is_multilayer = (
        file_format == "OPEN_EXR_MULTILAYER"
    )

    if is_multilayer:
        # In multilayer EXR, file_output_items are layer names
        # inside one physical EXR file. Do not modify them.
        node.file_name = (
            f"{safe_node_name}_######"
        )

        return

    # For regular File Output nodes each item may produce
    # its own physical file.
    node.file_name = ""

    for item in node.file_output_items:
        clean_name = item.name.rstrip("_")

        if not re.search(r"#+", clean_name):
            clean_name += "_######"

        item.name = clean_name


def _find_output_files(
    output_dir: Path,
) -> list[Path]:
    files = [
        path.resolve()
        for path in output_dir.rglob("*")
        if path.is_file()
    ]

    return sorted(files)


def _safe_name(value: str) -> str:
    sanitized = re.sub(
        r"[^A-Za-z0-9_-]+",
        "_",
        value,
    )

    sanitized = sanitized.strip("_")

    return sanitized or "output"


def _parse_args(
    argv: list[str],
) -> dict[str, str]:
    try:
        separator_index = argv.index("--")
    except ValueError:
        return {}

    custom_args = argv[
        separator_index + 1:
    ]

    result: dict[str, str] = {}

    index = 0

    while index < len(custom_args):
        key = custom_args[index]

        if (
            not key.startswith("--")
            or index + 1 >= len(custom_args)
        ):
            index += 1
            continue

        result[key[2:]] = custom_args[index + 1]

        index += 2

    return result


def _require_arg(
    args: dict[str, str],
    name: str,
) -> str:
    value = args.get(name)

    if value is None or not value:
        raise ValueError(
            f'Missing required argument "--{name}".'
        )

    return value


def _emit(payload: dict) -> None:
    print(
        PROTOCOL_PREFIX
        + json.dumps(
            payload,
            ensure_ascii=False,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()