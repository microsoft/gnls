interface FunctionDetail {
  isTarget?: boolean
}

interface VariableDetail {
  isBuiltin?: boolean
  isInput?: boolean
  isLabel?: boolean
}

export function builtinFunctions(): string[] {
  return Object.keys(data.builtinFunctions)
}

export function builtinVariables(): string[] {
  return Object.keys(data.builtinVariables)
}

export function targetFunctions(): string[] {
  return Object.keys(data.targetGroups)
}

export function targetVariables(target?: string): string[] {
  const groups = <string[]>(target ? data.targetGroups[target] || [] : Object.keys(data.groupVariables))
  const variables = groups.flatMap((group) => data.groupVariables[group])
  return [...new Set(variables)]
}

export function functionDetail(name?: string): FunctionDetail {
  if (!name) return {}
  if (data.targetGroups[name]) return {isTarget: true}
  return data.functionDetail[name] || {}
}

export function variableDetail(name?: string): VariableDetail {
  if (!name) return {}
  if (data.builtinVariables[name]) return {isBuiltin: true}
  return data.variableDetail[name] || {}
}

const data = {
  builtinFunctions: {
    assert: true,
    declare_args: true,
    defined: true,
    exec_script: true,
    filter_exclude: true,
    filter_include: true,
    foreach: true,
    forward_variables_from: true,
    get_label_info: true,
    get_path_info: true,
    get_target_outputs: true,
    getenv: true,
    import: true,
    not_needed: true,
    pool: true,
    print: true,
    process_file_template: true,
    read_file: true,
    rebase_path: true,
    set_default_toolchain: true,
    set_defaults: true,
    split_list: true,
    string_join: true,
    string_replace: true,
    string_split: true,
    template: true,
    tool: true,
    toolchain: true,
    write_file: true,
  },
  builtinVariables: {
    current_cpu: true,
    current_os: true,
    current_toolchain: true,
    default_toolchain: true,
    gn_version: true,
    host_cpu: true,
    host_os: true,
    invoker: true,
    python_path: true,
    root_build_dir: true,
    root_gen_dir: true,
    root_out_dir: true,
    target_cpu: true,
    target_gen_dir: true,
    target_name: true,
    target_os: true,
    target_out_dir: true,
  },
  targetGroups: {
    action: ['action'],
    action_foreach: ['action'],
    bundle_data: ['copy'],
    config: ['flags', 'configs'],
    copy: ['copy'],
    create_bundle: ['bundle'],
    executable: ['general', 'deps', 'flags', 'configs', 'rust', 'swift'],
    generated_file: ['deps', 'configs', 'generate'],
    group: ['deps', 'configs'],
    loadable_module: ['general', 'deps', 'flags', 'configs', 'rust', 'rust_extra', 'swift'],
    rust_library: ['general', 'deps', 'flags', 'configs', 'rust'],
    rust_proc_macro: ['general', 'deps', 'flags', 'configs', 'rust'],
    shared_library: ['general', 'deps', 'flags', 'configs', 'rust', 'rust_extra', 'swift'],
    source_set: ['general', 'deps', 'flags', 'configs'],
    static_library: ['general', 'deps', 'flags', 'configs', 'static', 'rust', 'swift'],
  },
  groupVariables: {
    general: [
      'check_includes',
      'data',
      'friend',
      'inputs',
      'metadata',
      'output_dir',
      'output_extension',
      'output_name',
      'output_prefix_override',
      'public',
      'sources',
      'testonly',
      'visibility',
    ],
    deps: ['allow_circular_includes_from', 'assert_no_deps', 'data_deps', 'deps', 'public_deps', 'write_runtime_deps'],
    flags: [
      'arflags',
      'asmflags',
      'cflags_c',
      'cflags_cc',
      'cflags_objc',
      'cflags_objcc',
      'cflags',
      'configs',
      'defines',
      'externs',
      'framework_dirs',
      'frameworks',
      'include_dirs',
      'inputs',
      'ldflags',
      'lib_dirs',
      'libs',
      'precompiled_header_type',
      'precompiled_header',
      'precompiled_source',
      'rustenv',
      'rustflags',
      'swiftflags',
      'weak_frameworks',
    ],
    configs: ['all_dependent_configs', 'public_configs'],
    copy: ['data_deps', 'deps', 'metadata', 'outputs', 'public_deps', 'sources', 'visibility'],
    action: [
      'args',
      'data_deps',
      'data',
      'depfile',
      'deps',
      'inputs',
      'metadata',
      'outputs',
      'pool',
      'response_file_contents',
      'script',
      'sources',
    ],
    generate: ['contents', 'data_keys', 'output_conversion', 'rebase', 'walk_keys'],
    static: ['complete_static_lib'],
    bundle: [
      'bundle_contents_dir',
      'bundle_deps_filter',
      'bundle_executable_dir',
      'bundle_resources_dir',
      'bundle_root_dir',
      'code_signing_args',
      'code_signing_outputs',
      'code_signing_script',
      'code_signing_sources',
      'data_deps',
      'deps',
      'metadata',
      'partial_info_plist',
      'product_type',
      'public_deps',
      'visibility',
      'xcasset_compiler_flags',
      'xcode_extra_attributes',
      'xcode_test_application_name',
    ],
    rust: ['aliased_deps', 'crate_name', 'crate_root'],
    rust_extra: ['crate_type'],
    swift: ['bridge_header', 'module_name'],
  },
  functionDetail: {
    assert: {}, // (condition[, error])
    declare_args: {}, // () {}
    defined: {}, // (identifier)
    exec_script: {}, // (filename, arguments = [], input_conversion = "", file_dependencies = [])
    filter_exclude: {}, // (values, patterns)
    filter_include: {}, // (values, patterns)
    foreach: {}, // (element, list) {}
    forward_variables_from: {}, // (scope, variables, ignores = [])
    get_label_info: {}, // (label, attribute)
    get_path_info: {}, // (path, attribute)
    get_target_outputs: {}, // (target)
    getenv: {}, // (env)
    import: {}, // (file)
    not_needed: {}, // ([scope, ]variables, ignores = [])
    pool: {}, // (name) {}
    print: {}, // (...args)
    process_file_template: {}, // (files, template)
    read_file: {}, // (file, input_conversion)
    rebase_path: {}, // (paths, new_base = "", current_base = ".")
    set_default_toolchain: {}, // (toolchain)
    set_defaults: {}, // (target_type) {}
    split_list: {}, // (list, n)
    string_join: {}, // (separator, strings)
    string_replace: {}, // (string, old, new[, max])
    string_split: {}, // (string[, separator])
    template: {}, // (name) {}
    tool: {}, // (type) {}
    toolchain: {}, // (name) {}
    write_file: {}, // (filename, data, output_conversion = "")
  } as {[key: string]: FunctionDetail},
  variableDetail: {
    aliased_deps: {},
    all_dependent_configs: {isInput: true, isLabel: true},
    allow_circular_includes_from: {isInput: true, isLabel: true},
    arflags: {},
    args: {},
    asmflags: {},
    assert_no_deps: {isInput: true, isLabel: true},
    bridge_header: {isInput: true},
    bundle_contents_dir: {},
    bundle_deps_filter: {isInput: true, isLabel: true},
    bundle_executable_dir: {},
    bundle_resources_dir: {},
    bundle_root_dir: {},
    cflags: {},
    cflags_c: {},
    cflags_cc: {},
    cflags_objc: {},
    cflags_objcc: {},
    check_includes: {},
    code_signing_args: {},
    code_signing_outputs: {},
    code_signing_script: {isInput: true},
    code_signing_sources: {isInput: true},
    complete_static_lib: {},
    configs: {isInput: true, isLabel: true},
    contents: {},
    crate_name: {},
    crate_root: {},
    crate_type: {},
    data: {isInput: true},
    data_deps: {isInput: true, isLabel: true},
    data_keys: {},
    defines: {},
    depfile: {},
    deps: {isInput: true, isLabel: true},
    externs: {},
    framework_dirs: {isInput: true},
    frameworks: {},
    friend: {isInput: true, isLabel: true},
    include_dirs: {isInput: true},
    inputs: {isInput: true},
    ldflags: {},
    lib_dirs: {isInput: true},
    libs: {},
    metadata: {},
    module_name: {},
    output_conversion: {},
    output_dir: {},
    output_extension: {},
    output_name: {},
    output_prefix_override: {},
    outputs: {},
    partial_info_plist: {},
    pool: {isInput: true, isLabel: true},
    precompiled_header: {isInput: true},
    precompiled_header_type: {},
    precompiled_source: {isInput: true},
    product_type: {},
    public: {isInput: true},
    public_configs: {isInput: true, isLabel: true},
    public_deps: {isInput: true, isLabel: true},
    rebase: {},
    response_file_contents: {},
    script: {isInput: true},
    sources: {isInput: true},
    swiftflags: {},
    testonly: {},
    visibility: {isInput: true, isLabel: true},
    walk_keys: {},
    weak_frameworks: {},
    write_runtime_deps: {},
    xcasset_compiler_flags: {},
    xcode_extra_attributes: {},
    xcode_test_application_name: {},
  } as {[key: string]: VariableDetail},
}
