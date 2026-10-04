#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Convert WebGL dumps into Hyperion Chromium WebGL anti-detect presets.

Attribution & Data Sources:
    1. Camoufox fingerprint database:
       This Source Code Form is subject to the terms of the Mozilla Public
       License, v. 2.0 (MPL-2.0). Source: https://github.com/daijro/camoufox
       Used for Linux native desktop OpenGL profile (NVIDIA GeForce GTX 980).

    2. GoLogin fingerprint dataset:
       Commercial fingerprint profiles for Windows ANGLE (D3D11) environment.
       Used for Windows generic ANGLE preset.

    3. Khronos WebGL 1.0 / 2.0 and OpenGL ES Specifications:
       Khronos Group WebGL specification and registry (MIT/Khronos license).
       Source: https://www.khronos.org/registry/webgl/specs/latest/
"""

import argparse
import json
import math
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union


# Valid preset parameter types recognized by Hyperion C++ draft
VALID_TYPES = {
    "int",
    "uint",
    "float",
    "number",
    "bool",
    "string",
    "intvec",
    "uintvec",
    "floatvec",
    "boolvec",
}

# Mapping of string names used in GoLogin / WebGL to numeric GLenums
GL_NAME_TO_ENUM: Dict[str, int] = {
    "LINE_WIDTH": 2849,
    "CULL_FACE": 2884,
    "CULL_FACE_MODE": 2885,
    "FRONT_FACE": 2886,
    "DEPTH_RANGE": 2928,
    "DEPTH_TEST": 2929,
    "DEPTH_WRITEMASK": 2930,
    "DEPTH_CLEAR_VALUE": 2931,
    "DEPTH_FUNC": 2932,
    "STENCIL_TEST": 2960,
    "STENCIL_CLEAR_VALUE": 2961,
    "STENCIL_FUNC": 2962,
    "STENCIL_VALUE_MASK": 2963,
    "STENCIL_FAIL": 2964,
    "STENCIL_PASS_DEPTH_FAIL": 2965,
    "STENCIL_PASS_DEPTH_PASS": 2966,
    "STENCIL_REF": 2967,
    "STENCIL_WRITEMASK": 2968,
    "VIEWPORT": 2978,
    "DITHER": 3024,
    "BLEND": 3042,
    "READ_BUFFER": 3074,
    "SCISSOR_BOX": 3088,
    "SCISSOR_TEST": 3089,
    "COLOR_CLEAR_VALUE": 3106,
    "COLOR_WRITEMASK": 3107,
    "UNPACK_ROW_LENGTH": 3314,
    "UNPACK_SKIP_ROWS": 3315,
    "UNPACK_SKIP_PIXELS": 3316,
    "UNPACK_ALIGNMENT": 3317,
    "PACK_ROW_LENGTH": 3330,
    "PACK_SKIP_ROWS": 3331,
    "PACK_SKIP_PIXELS": 3332,
    "PACK_ALIGNMENT": 3333,
    "MAX_TEXTURE_SIZE": 3379,
    "MAX_VIEWPORT_DIMS": 3386,
    "SUBPIXEL_BITS": 3408,
    "RED_BITS": 3410,
    "GREEN_BITS": 3411,
    "BLUE_BITS": 3412,
    "ALPHA_BITS": 3413,
    "DEPTH_BITS": 3414,
    "STENCIL_BITS": 3415,
    "VENDOR": 7936,
    "RENDERER": 7937,
    "VERSION": 7938,
    "POLYGON_OFFSET_UNITS": 10752,
    "BLEND_COLOR": 32773,
    "BLEND_EQUATION_RGB": 32777,
    "POLYGON_OFFSET_FILL": 32823,
    "POLYGON_OFFSET_FACTOR": 32824,
    "UNPACK_SKIP_IMAGES": 32877,
    "UNPACK_IMAGE_HEIGHT": 32878,
    "MAX_3D_TEXTURE_SIZE": 32883,
    "SAMPLE_COVERAGE_INVERT": 32926,
    "SAMPLE_ALPHA_TO_COVERAGE": 32928,
    "SAMPLE_BUFFERS": 32936,
    "SAMPLES": 32937,
    "SAMPLE_COVERAGE_VALUE": 32938,
    "SAMPLE_COVERAGE": 32939,
    "BLEND_DST_RGB": 32968,
    "BLEND_SRC_RGB": 32969,
    "BLEND_DST_ALPHA": 32970,
    "BLEND_SRC_ALPHA": 32971,
    "MAX_ELEMENTS_VERTICES": 33000,
    "MAX_ELEMENTS_INDICES": 33001,
    "GENERATE_MIPMAP_HINT": 33170,
    "ALIASED_POINT_SIZE_RANGE": 33901,
    "ALIASED_LINE_WIDTH_RANGE": 33902,
    "ACTIVE_TEXTURE": 34016,
    "MAX_RENDERBUFFER_SIZE": 34024,
    "MAX_TEXTURE_LOD_BIAS": 34045,
    "MAX_TEXTURE_MAX_ANISOTROPY_EXT": 34047,
    "MAX_CUBE_MAP_TEXTURE_SIZE": 34076,
    "COMPRESSED_TEXTURE_FORMATS": 34467,
    "STENCIL_BACK_FUNC": 34816,
    "STENCIL_BACK_FAIL": 34817,
    "STENCIL_BACK_PASS_DEPTH_FAIL": 34818,
    "STENCIL_BACK_PASS_DEPTH_PASS": 34819,
    "MAX_DRAW_BUFFERS": 34852,
    "DRAW_BUFFER0": 34853,
    "DRAW_BUFFER1": 34854,
    "DRAW_BUFFER2": 34855,
    "DRAW_BUFFER3": 34856,
    "DRAW_BUFFER4": 34857,
    "DRAW_BUFFER5": 34858,
    "DRAW_BUFFER6": 34859,
    "DRAW_BUFFER7": 34860,
    "BLEND_EQUATION_ALPHA": 34877,
    "MAX_VERTEX_ATTRIBS": 34921,
    "MAX_TEXTURE_IMAGE_UNITS": 34930,
    "MAX_ARRAY_TEXTURE_LAYERS": 35071,
    "MIN_PROGRAM_TEXEL_OFFSET": 35076,
    "MAX_PROGRAM_TEXEL_OFFSET": 35077,
    "MAX_VERTEX_UNIFORM_BLOCKS": 35371,
    "MAX_FRAGMENT_UNIFORM_BLOCKS": 35373,
    "MAX_COMBINED_UNIFORM_BLOCKS": 35374,
    "MAX_UNIFORM_BUFFER_BINDINGS": 35375,
    "MAX_UNIFORM_BLOCK_SIZE": 35376,
    "MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS": 35377,
    "MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS": 35379,
    "UNIFORM_BUFFER_OFFSET_ALIGNMENT": 35380,
    "MAX_VERTEX_UNIFORM_COMPONENTS": 35657,
    "MAX_FRAGMENT_UNIFORM_COMPONENTS": 35658,
    "MAX_VARYING_COMPONENTS": 35659,
    "MAX_VERTEX_TEXTURE_IMAGE_UNITS": 35660,
    "MAX_COMBINED_TEXTURE_IMAGE_UNITS": 35661,
    "IMPLEMENTATION_COLOR_READ_FORMAT": 35723,
    "SHADING_LANGUAGE_VERSION": 35724,
    "IMPLEMENTATION_COLOR_READ_TYPE_OES": 35738,
    "IMPLEMENTATION_COLOR_READ_FORMAT_OES": 35739,
    "MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS": 35968,
    "RASTERIZER_DISCARD": 35977,
    "MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS": 35978,
    "MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS": 35979,
    "STENCIL_BACK_REF": 36003,
    "STENCIL_BACK_VALUE_MASK": 36004,
    "STENCIL_BACK_WRITEMASK": 36005,
    "MAX_COLOR_ATTACHMENTS": 36063,
    "MAX_SAMPLES": 36183,
    "MAX_ELEMENT_INDEX": 36203,
    "MAX_VERTEX_UNIFORM_VECTORS": 36347,
    "MAX_VARYING_VECTORS": 36348,
    "MAX_FRAGMENT_UNIFORM_VECTORS": 36349,
    "TRANSFORM_FEEDBACK_PAUSED": 36387,
    "TRANSFORM_FEEDBACK_ACTIVE": 36388,
    "MAX_SERVER_WAIT_TIMEOUT": 37137,
    "MAX_VERTEX_OUTPUT_COMPONENTS": 37154,
    "MAX_FRAGMENT_INPUT_COMPONENTS": 37157,
    "UNPACK_FLIP_Y_WEBGL": 37440,
    "UNPACK_PREMULTIPLY_ALPHA_WEBGL": 37441,
    "UNPACK_COLORSPACE_CONVERSION_WEBGL": 37443,
    "BROWSER_DEFAULT_WEBGL": 37444,
    "UNMASKED_VENDOR_WEBGL": 37445,
    "UNMASKED_RENDERER_WEBGL": 37446,
    "MAX_CLIENT_WAIT_TIMEOUT_WEBGL": 37447,
}

# Inverted mapping: GLenum -> name
GL_ENUM_TO_NAME: Dict[int, str] = {v: k for k, v in GL_NAME_TO_ENUM.items()}

# Exact normative type definitions according to WebGL 1.0 & 2.0 specifications
# and C++ Hyperion draft rules
SPECIFIC_TYPES: Dict[int, str] = {
    # boolvec
    3107: "boolvec",   # COLOR_WRITEMASK (4 bools)
    # intvec
    2978: "intvec",    # VIEWPORT
    3088: "intvec",    # SCISSOR_BOX
    3386: "intvec",    # MAX_VIEWPORT_DIMS
    # floatvec
    2928: "floatvec",  # DEPTH_RANGE
    3106: "floatvec",  # COLOR_CLEAR_VALUE
    32773: "floatvec", # BLEND_COLOR
    33901: "floatvec", # ALIASED_POINT_SIZE_RANGE
    33902: "floatvec", # ALIASED_LINE_WIDTH_RANGE
    # float (scalars)
    2849: "float",     # LINE_WIDTH
    2931: "float",     # DEPTH_CLEAR_VALUE
    10752: "float",    # POLYGON_OFFSET_UNITS
    32824: "float",    # POLYGON_OFFSET_FACTOR
    32938: "float",    # SAMPLE_COVERAGE_VALUE
    34045: "float",    # MAX_TEXTURE_LOD_BIAS
    # uint (32-bit unsigned masks & element index)
    2963: "uint",      # STENCIL_VALUE_MASK
    2968: "uint",      # STENCIL_WRITEMASK
    36004: "uint",     # STENCIL_BACK_VALUE_MASK
    36005: "uint",     # STENCIL_BACK_WRITEMASK
    36203: "uint",     # MAX_ELEMENT_INDEX (0xFFFFFFFF)
    # uintvec
    34467: "uintvec",  # COMPRESSED_TEXTURE_FORMATS
    # number (double / 64-bit limits)
    37137: "number",   # MAX_SERVER_WAIT_TIMEOUT
    37447: "number",   # MAX_CLIENT_WAIT_TIMEOUT_WEBGL
    # string
    7936: "string",    # VENDOR
    7937: "string",    # RENDERER
    7938: "string",    # VERSION
    35724: "string",   # SHADING_LANGUAGE_VERSION
    37445: "string",   # UNMASKED_VENDOR_WEBGL
    37446: "string",   # UNMASKED_RENDERER_WEBGL
    # bool
    2884: "bool",      # CULL_FACE
    2929: "bool",      # DEPTH_TEST
    2930: "bool",      # DEPTH_WRITEMASK
    2960: "bool",      # STENCIL_TEST
    3024: "bool",      # DITHER
    3042: "bool",      # BLEND
    3089: "bool",      # SCISSOR_TEST
    32823: "bool",     # POLYGON_OFFSET_FILL
    32926: "bool",     # SAMPLE_COVERAGE_INVERT
    32928: "bool",     # SAMPLE_ALPHA_TO_COVERAGE
    32939: "bool",     # SAMPLE_COVERAGE
    35977: "bool",     # RASTERIZER_DISCARD
    36387: "bool",     # TRANSFORM_FEEDBACK_PAUSED
    36388: "bool",     # TRANSFORM_FEEDBACK_ACTIVE
    37440: "bool",     # UNPACK_FLIP_Y_WEBGL
    37441: "bool",     # UNPACK_PREMULTIPLY_ALPHA_WEBGL
}

# Standard 12 WebGL shader precision combinations for desktop highp GPUs
DEFAULT_SHADER_PRECISION: Dict[str, Dict[str, int]] = {
    # VERTEX_SHADER (35633)
    "35633_36336": {"rangeMin": 127, "rangeMax": 127, "precision": 23},  # LOW_FLOAT
    "35633_36337": {"rangeMin": 127, "rangeMax": 127, "precision": 23},  # MEDIUM_FLOAT
    "35633_36338": {"rangeMin": 127, "rangeMax": 127, "precision": 23},  # HIGH_FLOAT
    "35633_36339": {"rangeMin": 24, "rangeMax": 24, "precision": 0},     # LOW_INT
    "35633_36340": {"rangeMin": 24, "rangeMax": 24, "precision": 0},     # MEDIUM_INT
    "35633_36341": {"rangeMin": 24, "rangeMax": 24, "precision": 0},     # HIGH_INT
    # FRAGMENT_SHADER (35632)
    "35632_36336": {"rangeMin": 127, "rangeMax": 127, "precision": 23},  # LOW_FLOAT
    "35632_36337": {"rangeMin": 127, "rangeMax": 127, "precision": 23},  # MEDIUM_FLOAT
    "35632_36338": {"rangeMin": 127, "rangeMax": 127, "precision": 23},  # HIGH_FLOAT
    "35632_36339": {"rangeMin": 24, "rangeMax": 24, "precision": 0},     # LOW_INT
    "35632_36340": {"rangeMin": 24, "rangeMax": 24, "precision": 0},     # MEDIUM_INT
    "35632_36341": {"rangeMin": 24, "rangeMax": 24, "precision": 0},     # HIGH_INT
}

# Standard Windows ANGLE D3D11 WebGL 1.0 extensions
WINDOWS_ANGLE_WEBGL1_EXTENSIONS: List[str] = [
    "ANGLE_instanced_arrays",
    "EXT_blend_minmax",
    "EXT_clip_control",
    "EXT_color_buffer_half_float",
    "EXT_depth_clamp",
    "EXT_float_blend",
    "EXT_frag_depth",
    "EXT_polygon_offset_clamp",
    "EXT_shader_texture_lod",
    "EXT_texture_compression_bptc",
    "EXT_texture_compression_rgtc",
    "EXT_texture_filter_anisotropic",
    "EXT_texture_mirror_clamp_to_edge",
    "KHR_parallel_shader_compile",
    "NV_shader_noperspective_interpolation",
    "OES_draw_buffers_indexed",
    "OES_element_index_uint",
    "OES_fbo_render_mipmap",
    "OES_standard_derivatives",
    "OES_texture_float",
    "OES_texture_float_linear",
    "OES_texture_half_float",
    "OES_texture_half_float_linear",
    "OES_vertex_array_object",
    "OVR_multiview2",
    "WEBGL_blend_func_extended",
    "WEBGL_color_buffer_float",
    "WEBGL_compressed_texture_s3tc",
    "WEBGL_compressed_texture_s3tc_srgb",
    "WEBGL_debug_renderer_info",
    "WEBGL_debug_shaders",
    "WEBGL_depth_texture",
    "WEBGL_draw_buffers",
    "WEBGL_lose_context",
    "WEBGL_multi_draw",
    "WEBGL_polygon_mode",
]


def classify_and_cast_param(pname: int, raw_value: Any) -> Optional[Dict[str, Any]]:
    """
    Classify parameter type and return {type: ..., value: ...} entry.
    Skip null or unconvertible values.
    """
    if raw_value is None:
        return None
    if isinstance(raw_value, str) and raw_value.strip().lower() in ("n/a", "null", "undefined"):
        return None

    # Determine type name
    if pname in SPECIFIC_TYPES:
        target_type = SPECIFIC_TYPES[pname]
    elif isinstance(raw_value, bool):
        target_type = "bool"
    elif isinstance(raw_value, (int, float)):
        if raw_value == 4294967295:
            target_type = "uint"
        else:
            target_type = "int"
    elif isinstance(raw_value, str):
        target_type = "string"
    elif isinstance(raw_value, (list, tuple)):
        if all(isinstance(x, bool) for x in raw_value):
            target_type = "boolvec"
        else:
            target_type = "intvec"
    elif isinstance(raw_value, dict):
        # GoLogin array format: {'0': 1, '1': 1}
        items = [raw_value[str(i)] for i in range(len(raw_value))]
        if pname in SPECIFIC_TYPES and SPECIFIC_TYPES[pname] == "floatvec":
            target_type = "floatvec"
        elif pname in SPECIFIC_TYPES and SPECIFIC_TYPES[pname] == "intvec":
            target_type = "intvec"
        else:
            target_type = "intvec"
        raw_value = items
    else:
        return None

    # Cast to target type safely
    try:
        if target_type == "int":
            val = int(raw_value)
            if not (-2147483648 <= val <= 2147483647):
                return None
            return {"type": "int", "value": val}

        elif target_type == "uint":
            val = int(raw_value)
            if not (0 <= val <= 4294967295):
                return None
            return {"type": "uint", "value": val}

        elif target_type == "float":
            val = float(raw_value)
            if not math.isfinite(val):
                return None
            return {"type": "float", "value": val}

        elif target_type == "number":
            val = float(raw_value)
            if not math.isfinite(val):
                return None
            return {"type": "number", "value": val}

        elif target_type == "bool":
            return {"type": "bool", "value": bool(raw_value)}

        elif target_type == "string":
            return {"type": "string", "value": str(raw_value)}

        elif target_type == "intvec":
            if isinstance(raw_value, dict):
                raw_value = [raw_value[str(i)] for i in range(len(raw_value))]
            vec = [int(x) for x in raw_value]
            for x in vec:
                if not (-2147483648 <= x <= 2147483647):
                    return None
            return {"type": "intvec", "value": vec}

        elif target_type == "uintvec":
            if isinstance(raw_value, dict):
                raw_value = [raw_value[str(i)] for i in range(len(raw_value))]
            vec = [int(x) for x in raw_value]
            for x in vec:
                if not (0 <= x <= 4294967295):
                    return None
            return {"type": "uintvec", "value": vec}

        elif target_type == "floatvec":
            if isinstance(raw_value, dict):
                raw_value = [raw_value[str(i)] for i in range(len(raw_value))]
            vec = [float(x) for x in raw_value]
            for x in vec:
                if not math.isfinite(x):
                    return None
            return {"type": "floatvec", "value": vec}

        elif target_type == "boolvec":
            if isinstance(raw_value, dict):
                raw_value = [raw_value[str(i)] for i in range(len(raw_value))]
            if len(raw_value) != 4:
                return None
            return {"type": "boolvec", "value": [bool(x) for x in raw_value]}

    except (ValueError, TypeError, KeyError):
        return None

    return None


def convert_camoufox_preset(
    dump_data: Dict[str, Any],
    preset_id: str = "nvidia_gtx980_linux",
    normalize_chromium: bool = True,
) -> Dict[str, Any]:
    """
    Convert Camoufox Linux OpenGL dump into Hyperion preset format.
    Camoufox keys:
        'webGl:parameters', 'webGl:supportedExtensions', 'webGl:shaderPrecisionFormats'
        'webGl2:parameters', 'webGl2:supportedExtensions', 'webGl2:shaderPrecisionFormats'
    """
    result: Dict[str, Any] = {"id": preset_id}

    for ctx, prefix in [("webgl1", "webGl:"), ("webgl2", "webGl2:")]:
        ctx_dict: Dict[str, Any] = {}

        # 1. Parameters
        params: Dict[str, Any] = {}
        raw_params = dump_data.get(f"{prefix}parameters", {})
        for k_str, val in sorted(raw_params.items(), key=lambda item: int(item[0])):
            pname = int(k_str)
            cast_entry = classify_and_cast_param(pname, val)
            if cast_entry is not None:
                params[str(pname)] = cast_entry

        # Chromium WebGL normalization (replace Firefox 'Mozilla'/'WebGL 1.0' signatures)
        if normalize_chromium:
            # 7936 VENDOR -> 'WebKit'
            params["7936"] = {"type": "string", "value": "WebKit"}
            # 7937 RENDERER -> 'WebKit WebGL'
            params["7937"] = {"type": "string", "value": "WebKit WebGL"}
            # 7938 VERSION
            if ctx == "webgl1":
                params["7938"] = {"type": "string", "value": "WebGL 1.0 (OpenGL ES 2.0 Chromium)"}
                params["35724"] = {"type": "string", "value": "WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)"}
            else:
                params["7938"] = {"type": "string", "value": "WebGL 2.0 (OpenGL ES 3.0 Chromium)"}
                params["35724"] = {"type": "string", "value": "WebGL GLSL ES 3.00 (OpenGL ES GLSL ES 3.0 Chromium)"}

        ctx_dict["parameters"] = params

        # 2. Extensions (canonical list)
        exts = dump_data.get(f"{prefix}supportedExtensions", [])
        # Ensure ASCII non-empty unique
        clean_exts: List[str] = []
        for e in exts:
            e_str = str(e).strip()
            if e_str and e_str.isascii() and e_str not in clean_exts:
                clean_exts.append(e_str)
        ctx_dict["extensions"] = clean_exts

        # 3. Shader Precision
        raw_prec = dump_data.get(f"{prefix}shaderPrecisionFormats", {})
        prec_dict: Dict[str, Any] = {}
        for k_str, v_dict in raw_prec.items():
            norm_key = k_str.replace(",", "_")
            if isinstance(v_dict, dict) and "rangeMin" in v_dict and "rangeMax" in v_dict and "precision" in v_dict:
                prec_dict[norm_key] = {
                    "rangeMin": int(v_dict["rangeMin"]),
                    "rangeMax": int(v_dict["rangeMax"]),
                    "precision": int(v_dict["precision"]),
                }
        ctx_dict["shader_precision"] = prec_dict

        result[ctx] = ctx_dict

    return result


def convert_gologin_preset(
    dump_data: Dict[str, Any],
    preset_id: str = "windows_generic_angle",
) -> Dict[str, Any]:
    """
    Convert GoLogin Windows ANGLE dump into Hyperion preset format.
    GoLogin keys:
        'Gologin.webglParams.glParamValues'
        'Gologin.webglParams.extensions'
        'Gologin.webGLMetadata.vendor' / 'renderer'
        'Gologin.webglParams.textureMaxAnisotropyExt'
    """
    gologin = dump_data.get("Gologin", dump_data)
    wp = gologin.get("webglParams", {})
    gl_params_list = wp.get("glParamValues", [])
    md = gologin.get("webGLMetadata", {})

    # Extract all raw params by numeric enum
    raw_pnames: Dict[int, Any] = {}
    for item in gl_params_list:
        name = item.get("name")
        val = item.get("value")
        if isinstance(name, str) and name in GL_NAME_TO_ENUM:
            pname = GL_NAME_TO_ENUM[name]
            raw_pnames[pname] = val
        elif isinstance(name, int):
            raw_pnames[name] = val

    # Add metadata unmasked renderer & vendor
    if "vendor" in md:
        raw_pnames[37445] = md["vendor"]
    if "renderer" in md:
        raw_pnames[37446] = md["renderer"]

    # Add anisotropic filter max
    if "textureMaxAnisotropyExt" in wp:
        raw_pnames[34047] = wp["textureMaxAnisotropyExt"]

    # WebGL2-exclusive parameter enums
    webgl2_exclusive_pnames = {
        3074, 3314, 3315, 3316, 3330, 3331, 3332, 32877, 32878, 32883,
        33000, 33001, 34045, 34852, 34853, 34854, 34855, 34856, 34857,
        34858, 34859, 34860, 35071, 35076, 35077, 35371, 35373, 35374,
        35375, 35376, 35377, 35379, 35380, 35657, 35658, 35659, 35723,
        35968, 35977, 35978, 35979, 36063, 36183, 36203, 36387, 36388,
        37137, 37154, 37157, 37447,
    }

    # Standard Windows ANGLE D3D11 defaults for parameters not present in gologin
    standard_angle_defaults: Dict[int, Any] = {
        # Buffer bits
        3408: 4,     # SUBPIXEL_BITS
        3410: 8,     # RED_BITS
        3411: 8,     # GREEN_BITS
        3412: 8,     # BLUE_BITS
        3413: 8,     # ALPHA_BITS
        3414: 24,    # DEPTH_BITS
        3415: 0,     # STENCIL_BITS
        32936: 1,    # SAMPLE_BUFFERS
        32937: 4,    # SAMPLES
    }

    # WebGL 2.0 ANGLE defaults for parameters not in dump
    standard_angle_webgl2_defaults: Dict[int, Any] = {
        3074: 1029,          # READ_BUFFER (GL_BACK)
        3314: 0,             # UNPACK_ROW_LENGTH
        3315: 0,             # UNPACK_SKIP_ROWS
        3316: 0,             # UNPACK_SKIP_PIXELS
        3330: 0,             # PACK_ROW_LENGTH
        3331: 0,             # PACK_SKIP_ROWS
        3332: 0,             # PACK_SKIP_PIXELS
        32877: 0,            # UNPACK_SKIP_IMAGES
        32878: 0,            # UNPACK_IMAGE_HEIGHT
        33000: 1048576,      # MAX_ELEMENTS_VERTICES
        33001: 1048576,      # MAX_ELEMENTS_INDICES
        34853: 1029,         # DRAW_BUFFER0 (GL_BACK)
        34854: 0,            # DRAW_BUFFER1 (GL_NONE)
        34855: 0,            # DRAW_BUFFER2 (GL_NONE)
        34856: 0,            # DRAW_BUFFER3 (GL_NONE)
        34857: 0,            # DRAW_BUFFER4 (GL_NONE)
        34858: 0,            # DRAW_BUFFER5 (GL_NONE)
        34859: 0,            # DRAW_BUFFER6 (GL_NONE)
        34860: 0,            # DRAW_BUFFER7 (GL_NONE)
        35723: 4352,         # IMPLEMENTATION_COLOR_READ_FORMAT
        35977: False,        # RASTERIZER_DISCARD
        36203: 4294967295,   # MAX_ELEMENT_INDEX
        36387: False,        # TRANSFORM_FEEDBACK_PAUSED
        36388: False,        # TRANSFORM_FEEDBACK_ACTIVE
        37137: 0.0,          # MAX_SERVER_WAIT_TIMEOUT
        37447: 1000000000.0, # MAX_CLIENT_WAIT_TIMEOUT_WEBGL
    }

    result: Dict[str, Any] = {"id": preset_id}

    # Build webgl1 section
    webgl1_params: Dict[str, Any] = {}
    for pname, def_val in standard_angle_defaults.items():
        if pname not in raw_pnames:
            cast_entry = classify_and_cast_param(pname, def_val)
            if cast_entry:
                webgl1_params[str(pname)] = cast_entry

    for pname, val in raw_pnames.items():
        if pname in webgl2_exclusive_pnames:
            continue
        cast_entry = classify_and_cast_param(pname, val)
        if cast_entry is not None:
            webgl1_params[str(pname)] = cast_entry

    # Force WebGL 1.0 version strings
    webgl1_params["7936"] = {"type": "string", "value": "WebKit"}
    webgl1_params["7937"] = {"type": "string", "value": "WebKit WebGL"}
    webgl1_params["7938"] = {"type": "string", "value": "WebGL 1.0 (OpenGL ES 2.0 Chromium)"}
    webgl1_params["35724"] = {"type": "string", "value": "WebGL GLSL ES 1.0 (OpenGL ES GLSL ES 1.0 Chromium)"}

    result["webgl1"] = {
        "parameters": dict(sorted(webgl1_params.items(), key=lambda item: int(item[0]))),
        "extensions": WINDOWS_ANGLE_WEBGL1_EXTENSIONS,
        "shader_precision": DEFAULT_SHADER_PRECISION,
    }

    # Build webgl2 section
    webgl2_params: Dict[str, Any] = {}
    # Start from webgl1 params (inherits common limits)
    for k_str, entry in webgl1_params.items():
        webgl2_params[k_str] = dict(entry)

    # Add WebGL2 exclusive params from dump
    for pname, val in raw_pnames.items():
        if pname in webgl2_exclusive_pnames:
            cast_entry = classify_and_cast_param(pname, val)
            if cast_entry is not None:
                webgl2_params[str(pname)] = cast_entry

    # Add standard ANGLE WebGL 2 defaults for missing
    for pname, def_val in standard_angle_webgl2_defaults.items():
        if str(pname) not in webgl2_params:
            cast_entry = classify_and_cast_param(pname, def_val)
            if cast_entry is not None:
                webgl2_params[str(pname)] = cast_entry

    # Set WebGL 2.0 version strings
    webgl2_params["7936"] = {"type": "string", "value": "WebKit"}
    webgl2_params["7937"] = {"type": "string", "value": "WebKit WebGL"}
    webgl2_params["7938"] = {"type": "string", "value": "WebGL 2.0 (OpenGL ES 3.0 Chromium)"}
    webgl2_params["35724"] = {"type": "string", "value": "WebGL GLSL ES 3.00 (OpenGL ES GLSL ES 3.0 Chromium)"}

    # WebGL2 extensions from GoLogin
    raw_exts = wp.get("extensions", [])
    webgl2_exts: List[str] = []
    for e in raw_exts:
        e_str = str(e).strip()
        if e_str and e_str.isascii() and e_str not in webgl2_exts:
            webgl2_exts.append(e_str)

    result["webgl2"] = {
        "parameters": dict(sorted(webgl2_params.items(), key=lambda item: int(item[0]))),
        "extensions": webgl2_exts,
        "shader_precision": DEFAULT_SHADER_PRECISION,
    }

    return result


def validate_preset(preset: Dict[str, Any]) -> List[str]:
    """
    Validate preset data against Hyperion C++ draft schema.
    Returns list of validation errors (empty if valid).
    """
    errors: List[str] = []
    if "id" not in preset or not isinstance(preset["id"], str):
        errors.append("Preset must have a non-empty string 'id'")

    for ctx in ("webgl1", "webgl2"):
        if ctx not in preset:
            errors.append(f"Missing section '{ctx}'")
            continue
        section = preset[ctx]
        if not isinstance(section, dict):
            errors.append(f"Section '{ctx}' must be a dictionary")
            continue

        # Validate parameters
        params = section.get("parameters")
        if not isinstance(params, dict):
            errors.append(f"Section '{ctx}.parameters' must be a dictionary")
        else:
            for k, entry in params.items():
                if not k.isdigit():
                    errors.append(f"{ctx}.parameters key '{k}' must be decimal number string")
                if not isinstance(entry, dict):
                    errors.append(f"{ctx}.parameters['{k}'] must be a dictionary")
                    continue
                t = entry.get("type")
                v = entry.get("value")
                if t not in VALID_TYPES:
                    errors.append(f"{ctx}.parameters['{k}'] invalid type '{t}'")
                    continue

                if t == "int":
                    if not isinstance(v, int) or isinstance(v, bool) or not (-2147483648 <= v <= 2147483647):
                        errors.append(f"{ctx}.parameters['{k}'] int out of range or not int: {v}")
                elif t == "uint":
                    if not isinstance(v, int) or isinstance(v, bool) or not (0 <= v <= 4294967295):
                        errors.append(f"{ctx}.parameters['{k}'] uint out of range: {v}")
                elif t in ("float", "number"):
                    if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v):
                        errors.append(f"{ctx}.parameters['{k}'] {t} invalid: {v}")
                elif t == "bool":
                    if not isinstance(v, bool):
                        errors.append(f"{ctx}.parameters['{k}'] bool invalid: {v}")
                elif t == "string":
                    if not isinstance(v, str):
                        errors.append(f"{ctx}.parameters['{k}'] string invalid: {v}")
                elif t == "intvec":
                    if not isinstance(v, list) or not all(isinstance(x, int) and not isinstance(x, bool) for x in v):
                        errors.append(f"{ctx}.parameters['{k}'] intvec invalid: {v}")
                elif t == "uintvec":
                    if not isinstance(v, list) or not all(isinstance(x, int) and not isinstance(x, bool) and 0 <= x <= 4294967295 for x in v):
                        errors.append(f"{ctx}.parameters['{k}'] uintvec invalid: {v}")
                elif t == "floatvec":
                    if not isinstance(v, list) or not all(isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) for x in v):
                        errors.append(f"{ctx}.parameters['{k}'] floatvec invalid: {v}")
                elif t == "boolvec":
                    if not isinstance(v, list) or len(v) != 4 or not all(isinstance(x, bool) for x in v):
                        errors.append(f"{ctx}.parameters['{k}'] boolvec must have 4 bools: {v}")

        # Validate extensions
        exts = section.get("extensions")
        if not isinstance(exts, list):
            errors.append(f"Section '{ctx}.extensions' must be a list")
        else:
            for e in exts:
                if not isinstance(e, str) or not e or not e.isascii():
                    errors.append(f"{ctx}.extensions contains non-ASCII or empty string: {e}")

        # Validate shader_precision
        prec = section.get("shader_precision")
        if not isinstance(prec, dict):
            errors.append(f"Section '{ctx}.shader_precision' must be a dictionary")
        else:
            for pk, pv in prec.items():
                parts = pk.split("_")
                if len(parts) != 2 or not parts[0].isdigit() or not parts[1].isdigit():
                    errors.append(f"{ctx}.shader_precision key '{pk}' must be '<shader>_<precision>'")
                if not isinstance(pv, dict):
                    errors.append(f"{ctx}.shader_precision['{pk}'] must be a dict")
                else:
                    for field in ("rangeMin", "rangeMax", "precision"):
                        if field not in pv or not isinstance(pv[field], int) or pv[field] < 0:
                            errors.append(f"{ctx}.shader_precision['{pk}'].{field} must be non-negative int")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert WebGL dumps to Hyperion WebGL presets")
    parser.add_argument("--camoufox-dump", default="/tmp/webgl-gtx980.json", help="Path to Camoufox WebGL JSON dump")
    parser.add_argument("--gologin-dump", default="/tmp/gologin_win.json", help="Path to GoLogin WebGL JSON dump")
    parser.add_argument("--output-dir", default="data/webgl_presets", help="Output directory for presets")
    parser.add_argument("--validate-only", action="store_true", help="Only validate existing preset files")

    args = parser.parse_args()
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.validate_only:
        all_valid = True
        for p_file in out_dir.glob("*.json"):
            with open(p_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            errs = validate_preset(data)
            if errs:
                all_valid = False
                print(f"[FAIL] {p_file.name}: {len(errs)} errors")
                for err in errs[:5]:
                    print(f"  - {err}")
            else:
                print(f"[OK] {p_file.name}")
        return 0 if all_valid else 1

    # 1. Convert Camoufox -> nvidia_gtx980_linux.json
    camoufox_path = Path(args.camoufox_dump)
    if camoufox_path.is_file():
        with open(camoufox_path, "r", encoding="utf-8") as f:
            cam_data = json.load(f)
        nvidia_preset = convert_camoufox_preset(cam_data, preset_id="nvidia_gtx980_linux")
        errs = validate_preset(nvidia_preset)
        if errs:
            print(f"[ERROR] Validation failed for nvidia_gtx980_linux ({len(errs)} errors):")
            for e in errs[:10]:
                print(f"  {e}")
            return 1

        nvidia_file = out_dir / "nvidia_gtx980_linux.json"
        with open(nvidia_file, "w", encoding="utf-8") as f:
            json.dump(nvidia_preset, f, indent=2, sort_keys=True)
            f.write("\n")
        print(f"[OK] Generated {nvidia_file} ({len(nvidia_preset['webgl1']['parameters'])} WGL1, {len(nvidia_preset['webgl2']['parameters'])} WGL2 params)")
    else:
        print(f"[WARN] Camoufox dump not found at {camoufox_path}")

    # 2. Convert GoLogin -> windows_generic_angle.json
    gologin_path = Path(args.gologin_dump)
    if gologin_path.is_file():
        with open(gologin_path, "r", encoding="utf-8") as f:
            gol_data = json.load(f)
        win_preset = convert_gologin_preset(gol_data, preset_id="windows_generic_angle")
        errs = validate_preset(win_preset)
        if errs:
            print(f"[ERROR] Validation failed for windows_generic_angle ({len(errs)} errors):")
            for e in errs[:10]:
                print(f"  {e}")
            return 1

        win_file = out_dir / "windows_generic_angle.json"
        with open(win_file, "w", encoding="utf-8") as f:
            json.dump(win_preset, f, indent=2, sort_keys=True)
            f.write("\n")
        print(f"[OK] Generated {win_file} ({len(win_preset['webgl1']['parameters'])} WGL1, {len(win_preset['webgl2']['parameters'])} WGL2 params)")
    else:
        print(f"[WARN] GoLogin dump not found at {gologin_path}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
