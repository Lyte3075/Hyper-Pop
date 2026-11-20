/* tslint:disable */
/* eslint-disable */

/**
 * Sandboxed bash interpreter running entirely in the browser.
 */
export class Bash {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Register a live command. Cloned I/O handles expire with the execution.
     */
    addCommand(name: string, callback: Function): void;
    /**
     * Analyze a script without executing or mutating it.
     */
    analyze(script: string): any;
    appendFileBytes(path: string, content: Uint8Array): void;
    /**
     * Append to a file in the virtual filesystem (creating it if absent).
     */
    appendFile(path: string, content: string): void;
    /**
     * Set the sticky cancellation token checked at command boundaries.
     */
    cancel(): void;
    /**
     * Restore a content-addressed commit. Mutation is atomic on failure.
     */
    checkout(commit_id: string, objects: any, policy?: string | null): void;
    /**
     * Clear the sticky cancellation token after an execution has stopped.
     */
    clearCancel(): void;
    /**
     * Capture content-addressed state for persistence and branching.
     */
    commit(options: any): any;
    /**
     * Execute `commands` synchronously and return the result.
     *
     * Only valid for scripts that complete without yielding — i.e. plain bash
     * and `jq`. If the script invokes an async custom builtin (or otherwise
     * suspends), this throws directing you to `execute()`.
     */
    executeSync(commands: string): ExecResult;
    /**
     * Execute asynchronously while forwarding incremental output.
     */
    executeWithOutput(commands: string, on_output: Function): Promise<any>;
    /**
     * Execute with a revocable, per-execution host dispatcher.
     */
    executeWithRuntime(commands: string, dispatcher: Function, on_output: Function | null | undefined, options: any): Promise<any>;
    /**
     * Execute `commands` asynchronously, returning a `Promise<ExecResult>`.
     *
     * This is the path that supports async JS custom builtins.
     */
    execute(commands: string, options: any): Promise<any>;
    /**
     * Whether a path exists in the virtual filesystem.
     */
    exists(path: string): boolean;
    /**
     * A live handle to the interpreter's virtual filesystem. The same VFS the
     * executing script sees, and the same object passed as `ctx.fs` to custom
     * builtins.
     */
    fs(): FileSystem;
    /**
     * List entry names in a directory.
     */
    ls(path: string): string[];
    /**
     * Create a directory (recursively) in the virtual filesystem.
     */
    mkdir(path: string): void;
    /**
     * Create a new interpreter. `options` is an optional plain object; see the
     * TypeScript `BashOptions` for the supported fields.
     */
    constructor(options: any);
    readFileBytes(path: string): Uint8Array;
    /**
     * Read a file from the virtual filesystem as UTF-8.
     */
    readFile(path: string): string;
    /**
     * Remove a file or directory (recursively) from the virtual filesystem.
     */
    remove(path: string): void;
    /**
     * Reset the interpreter to a fresh state, preserving construction options
     * and registered custom builtins.
     */
    reset(): void;
    writeFileBytes(path: string, content: Uint8Array): void;
    /**
     * Write a UTF-8 file to the virtual filesystem.
     */
    writeFile(path: string, content: string): void;
}

export class CommandInput {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    [Symbol.asyncIterator](): CommandInput;
    next(): Promise<any>;
    readChunk(): Promise<any>;
}

export class CommandOutput {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    write(bytes: Uint8Array): Promise<any>;
}

/**
 * Result of a bash execution, mirrored from the Rust `ExecResult`.
 */
export class ExecResult {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    exitCode: number;
    stderrBytes: Uint8Array;
    stderrTruncated: boolean;
    stderr: string;
    stdoutBytes: Uint8Array;
    stdoutTruncated: boolean;
    stdout: string;
    success: boolean;
}

/**
 * A live handle to a `Bash` instance's virtual filesystem.
 *
 * Reads observe earlier script writes and writes are visible to subsequent
 * commands — it is the same VFS the executing script sees. Exposed both as
 * `bash.fs()` and as `ctx.fs` inside custom-builtin callbacks.
 */
export class FileSystem {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Append bytes verbatim (creating the file if absent).
     */
    appendFileBytes(path: string, content: Uint8Array): void;
    /**
     * Append to a file (creating it if absent).
     */
    appendFile(path: string, content: string): void;
    /**
     * Whether a path exists.
     */
    exists(path: string): boolean;
    /**
     * List entry names in a directory.
     */
    ls(path: string): string[];
    /**
     * Create a directory (and parents).
     */
    mkdir(path: string): void;
    /**
     * Read a file without interpreting its bytes as UTF-8.
     */
    readFileBytes(path: string): Uint8Array;
    /**
     * Read a file as UTF-8.
     */
    readFile(path: string): string;
    /**
     * Remove a file or directory (recursively).
     */
    remove(path: string): void;
    /**
     * Write bytes verbatim, replacing any existing content.
     */
    writeFileBytes(path: string, content: Uint8Array): void;
    /**
     * Write a UTF-8 file, replacing any existing content.
     */
    writeFile(path: string, content: string): void;
}

/**
 * Interactive bash session on an in-memory terminal.
 */
export class Terminal {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * The session's virtual filesystem.
     */
    fs(): FileSystem;
    /**
     * Whether a full-screen program (`vi`, `less`) is on the alternate screen.
     */
    isAlternateScreen(): boolean;
    /**
     * Start a session. `options` takes every `BashOptions` field plus `rows`
     * and `cols` (default 24x80).
     */
    constructor(options: any);
    /**
     * Change the size; full-screen programs redraw.
     */
    resize(rows: number, cols: number): void;
    /**
     * Run until the session waits for input or exits. Resolves to
     * `{ status: "idle" }` or `{ status: "exited", exitCode }`.
     */
    runUntilIdle(): Promise<any>;
    /**
     * The visible screen as plain text.
     */
    screenText(): string;
    /**
     * Queue raw input bytes.
     */
    sendBytes(input: Uint8Array): number;
    /**
     * Queue keystrokes (as xterm.js `onData` delivers them). Returns how many
     * bytes were accepted. Nothing runs until `runUntilIdle`.
     */
    send(input: string): number;
    /**
     * Drain raw output bytes (with escape sequences) since the last call.
     */
    takeOutput(): Uint8Array;
    /**
     * Current number of columns.
     */
    readonly cols: number;
    /**
     * Exit code once the shell has exited, else `undefined`.
     */
    readonly exitCode: number | undefined;
    /**
     * Current number of rows.
     */
    readonly rows: number;
}

/**
 * Install a panic hook that forwards Rust panics to `console.error` with a
 * readable message and stack, instead of the default unhelpful
 * `RuntimeError: unreachable`.
 */
export function __start(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __start: () => void;
    readonly __wbg_bash_free: (a: number, b: number) => void;
    readonly __wbg_commandinput_free: (a: number, b: number) => void;
    readonly __wbg_commandoutput_free: (a: number, b: number) => void;
    readonly __wbg_execresult_free: (a: number, b: number) => void;
    readonly __wbg_filesystem_free: (a: number, b: number) => void;
    readonly __wbg_get_execresult_exitCode: (a: number) => number;
    readonly __wbg_get_execresult_stderr: (a: number, b: number) => void;
    readonly __wbg_get_execresult_stderrBytes: (a: number, b: number) => void;
    readonly __wbg_get_execresult_stderrTruncated: (a: number) => number;
    readonly __wbg_get_execresult_stdout: (a: number, b: number) => void;
    readonly __wbg_get_execresult_stdoutBytes: (a: number, b: number) => void;
    readonly __wbg_get_execresult_stdoutTruncated: (a: number) => number;
    readonly __wbg_get_execresult_success: (a: number) => number;
    readonly __wbg_set_execresult_exitCode: (a: number, b: number) => void;
    readonly __wbg_set_execresult_stderr: (a: number, b: number, c: number) => void;
    readonly __wbg_set_execresult_stderrBytes: (a: number, b: number, c: number) => void;
    readonly __wbg_set_execresult_stderrTruncated: (a: number, b: number) => void;
    readonly __wbg_set_execresult_stdout: (a: number, b: number, c: number) => void;
    readonly __wbg_set_execresult_stdoutBytes: (a: number, b: number, c: number) => void;
    readonly __wbg_set_execresult_stdoutTruncated: (a: number, b: number) => void;
    readonly __wbg_set_execresult_success: (a: number, b: number) => void;
    readonly __wbg_terminal_free: (a: number, b: number) => void;
    readonly bash_addCommand: (a: number, b: number, c: number, d: number) => void;
    readonly bash_analyze: (a: number, b: number, c: number, d: number) => void;
    readonly bash_appendFile: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly bash_appendFileBytes: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly bash_cancel: (a: number) => void;
    readonly bash_checkout: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly bash_clearCancel: (a: number) => void;
    readonly bash_commit: (a: number, b: number, c: number) => void;
    readonly bash_execute: (a: number, b: number, c: number, d: number) => number;
    readonly bash_executeSync: (a: number, b: number, c: number, d: number) => void;
    readonly bash_executeWithOutput: (a: number, b: number, c: number, d: number) => number;
    readonly bash_executeWithRuntime: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly bash_exists: (a: number, b: number, c: number, d: number) => void;
    readonly bash_fs: (a: number) => number;
    readonly bash_ls: (a: number, b: number, c: number, d: number) => void;
    readonly bash_mkdir: (a: number, b: number, c: number, d: number) => void;
    readonly bash_new: (a: number, b: number) => void;
    readonly bash_readFile: (a: number, b: number, c: number, d: number) => void;
    readonly bash_readFileBytes: (a: number, b: number, c: number, d: number) => void;
    readonly bash_remove: (a: number, b: number, c: number, d: number) => void;
    readonly bash_reset: (a: number, b: number) => void;
    readonly bash_writeFile: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly bash_writeFileBytes: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly commandinput_Symbol_asyncIterator: (a: number) => number;
    readonly commandinput_next: (a: number) => number;
    readonly commandinput_readChunk: (a: number) => number;
    readonly commandoutput_write: (a: number, b: number) => number;
    readonly filesystem_appendFile: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly filesystem_appendFileBytes: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly filesystem_exists: (a: number, b: number, c: number, d: number) => void;
    readonly filesystem_ls: (a: number, b: number, c: number, d: number) => void;
    readonly filesystem_mkdir: (a: number, b: number, c: number, d: number) => void;
    readonly filesystem_readFile: (a: number, b: number, c: number, d: number) => void;
    readonly filesystem_readFileBytes: (a: number, b: number, c: number, d: number) => void;
    readonly filesystem_remove: (a: number, b: number, c: number, d: number) => void;
    readonly filesystem_writeFile: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly filesystem_writeFileBytes: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly terminal_cols: (a: number, b: number) => void;
    readonly terminal_exitCode: (a: number, b: number) => void;
    readonly terminal_fs: (a: number, b: number) => void;
    readonly terminal_isAlternateScreen: (a: number, b: number) => void;
    readonly terminal_new: (a: number, b: number) => void;
    readonly terminal_resize: (a: number, b: number, c: number, d: number) => void;
    readonly terminal_rows: (a: number, b: number) => void;
    readonly terminal_runUntilIdle: (a: number) => number;
    readonly terminal_screenText: (a: number, b: number) => void;
    readonly terminal_send: (a: number, b: number, c: number, d: number) => void;
    readonly terminal_sendBytes: (a: number, b: number, c: number, d: number) => void;
    readonly terminal_takeOutput: (a: number, b: number) => void;
    readonly __wasm_bindgen_func_elem_24294: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_24296: (a: number, b: number, c: number, d: number) => void;
    readonly __wasm_bindgen_func_elem_12860: (a: number, b: number) => void;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number) => void;
    readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export5: (a: number, b: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
