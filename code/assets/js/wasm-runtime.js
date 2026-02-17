/**
 * WebAssembly Runtime Manager
 * Handles loading and execution of code in various languages via WebAssembly
 */

import * as Comlink from "https://unpkg.com/comlink/dist/esm/comlink.mjs";
import Emception from './emception/emception.js'
import { load } from "./teaVM/javaSupport.js";

let stdOutValue = "";

const prejs = `
//Catch error from CPP segfault, this error cannot be caught otherwise.
window.onunhandledrejection = function(event) {
    console.log(event)
    if(event.reason.message==="unreachable"){
        crashed = true;
    }
}
var Module = {
    print: (function() {
        return function(text) {
            if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
            console.log(text);
            stdOutValue += text + \"\\n\";
           
        };
    })(),
    printErr: function(text) {
        if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
        if (0) { // XXX disabled for safety typeof dump == 'function') {
            dump(text + '\\n'); // fast, straight to the real console
        } else {
            console.error(text);
        }

        stdOutValue += text;


       
    }
};

`;

// True if the most recent C++ run crashed
let crashed = false;

const onprocessstart = (argv) => {
    console.log("onprocessstart", argv);
    // stdoutElement.value += '# ' + argv.join(' ') + "\n";
};
const onprocessend = () => {
    console.log("onprocessend");
    // document.getElementById("stdout").value += "onprocessend" + "\n";
};
const onstdout = (str) => {
    console.log(str);
    // stdOutValue += str;
};
const onstderr = (str) => {
    console.error(str);
    // stdOutValue += str;

    // stdoutElement.scrollTop = stdoutElement.scrollHeight; // focus on bottom
};

const EmceptionState = {
    MainNotLoaded: 0,
    MainLoading: 1,
    MainLoaded: 2,
    EmceptionLoading: 3,
    EmceptionLoaded: 4,
}
//WAS
// var loadingState = EmceptionState.MainNotLoaded;
var loadingState = EmceptionState.MainLoaded;
var emception;

let javaCompiler = null;

// todo: bug: this state machine is not running for the second time
async function preCompile(code, language) {
    switch (loadingState) {
        case EmceptionState.MainNotLoaded:
            loadingState = EmceptionState.MainLoading;
            var script = document.createElement('script');
            script.src = 'main.js';
            script.onload = () => {
                console.log("main.js loaded");
                loadingState = EmceptionState.MainLoaded;
                preCompile(code, language);
            }
            document.head.appendChild(script);
            return false;
        case EmceptionState.MainLoading:
            console.log("Main script is still loading. Please wait.");
            return false
        case EmceptionState.MainLoaded:
            console.log("initializing Emception...");
            loadingState = EmceptionState.EmceptionLoading;
            const emceptionWorker = new Worker("/js/emception/emception.worker.js", { type: 'module' })
            emception = Comlink.wrap(emceptionWorker);
            // emception.onstdout = onstdout;
            // emception.onstderr = onstderr;
            // emception.onprocessstart = onprocessstart;
            // emception.onprocessend = onprocessend;
            await emception.init();
            loadingState = EmceptionState.EmceptionLoaded;
            console.log("Emception initialized");
            return await preCompile(code, language);

        case EmceptionState.EmceptionLoading:
            console.log("Emception is still loading. Please wait.");
            return false;
        case EmceptionState.EmceptionLoaded:
            return await compile(code, language);
    }
}


async function compile(code, language) {
    // stdoutElement.value = "";
    // const sourceValue = sourceElement.value;
    stdOutValue = "";
    crashed = false;

    console.log("Compiling C++ code...\n");
    await emception.fileSystem.writeFile(`/working/main.${language}`, code);
    await emception.fileSystem.writeFile("/working/pre.js", prejs);

    const cmd = ((language == 'cpp') ? "em++" : "emcc") + ` -O2 -fexceptions --pre-js pre.js -sEXIT_RUNTIME=1 -sSINGLE_FILE=1 -sUSE_CLOSURE_COMPILER=0 main.${language} -o main.js`;
    // -L/lazy/pthread_files -lP1 -lP2 -lP3 -lP4 -lP5 -lP6 -lP7
    onprocessstart(`/emscripten/${cmd}`.split(/\s+/g));
    onstdout(`# ${cmd}`);
    // wait 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
    const result = await emception.run(cmd);
    console.log("ran compiler")

    if (result.returncode == 0) {
        const content = new TextDecoder().decode(await emception.fileSystem.readFile("/working/main.js"));
        onstdout(`# node ./main.js`);
        await new Promise(resolve => setTimeout(resolve, 100));

        eval(content);

        //wait 100ms
        await new Promise(resolve => setTimeout(resolve, 100));

        if (crashed) {
            throw new Error("Your program crashed before it could end. Stdout was:\n" + stdOutValue);
        }

        return stdOutValue;


    } else {
        console.log(`Emception compilation failed`);
        throw new Error("Compilation failed\n" + result.stderr);
    }
}



window.WasmRuntime = {
    // Track loaded runtimes
    loaded: {
        python: false,
        cpp: false,
        java: false
    },

    // Track loading state
    loading: {
        python: false,
        cpp: false,
        java: false
    },

    // Store runtime objects
    runtimes: {
        python: null,
        cpp: null,
        java: null
    },

    // Runtime loading callbacks
    callbacks: {
        python: [],
        cpp: [],
        java: []
    },

    /**
     * Load a specific language runtime
     * @param {string} language - The language to load ('python', 'cpp', or 'java')
     * @param {Function} callback - Optional callback to execute when loaded
     */
    loadRuntime: function (language, callback) {
        // If already loaded, execute callback immediately
        if (this.loaded[language]) {
            if (callback) callback(this.runtimes[language]);
            return;
        }

        // If currently loading, add callback to queue
        if (this.loading[language]) {
            if (callback) this.callbacks[language].push(callback);
            return;
        }

        // Set loading state
        this.loading[language] = true;
        if (callback) this.callbacks[language].push(callback);

        // Load the appropriate runtime
        switch (language) {
            case 'python':
                this.loadPythonRuntime();
                break;
            case 'cpp':
                this.loadCppRuntime();
                break;
            case 'java':
                this.loadJavaRuntime();
                break;
            default:
                console.error(`Unsupported language: ${language}`);
                this.loading[language] = false;
                break;
        }
    },

    /**
     * Load Pyodide (Python WebAssembly runtime)
     */
    loadPythonRuntime: function () {
        // Create script element to load Pyodide
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
        document.head.appendChild(script);

        script.onload = async () => {
            try {
                // Show loading message
                const outputPanel = document.getElementById('outputPanel');
                const outputContent = document.getElementById('outputContent');
                if (outputPanel && outputContent) {
                    outputPanel.style.display = 'block';
                    outputContent.innerHTML = '<div class="log-line">Loading Python interpreter...</div>';
                }

                // Load Pyodide
                this.runtimes.python = await loadPyodide();

                // Set up Python environment
                await this.runtimes.python.loadPackagesFromImports("numpy matplotlib pandas");

                // Mark as loaded
                this.loaded.python = true;
                this.loading.python = false;

                // Execute callbacks
                if (outputContent) {
                    outputContent.innerHTML += '<div class="log-line">Python interpreter ready!</div>';
                }

                // Execute all callbacks
                for (const callback of this.callbacks.python) {
                    callback(this.runtimes.python);
                }
                this.callbacks.python = [];
            } catch (error) {
                console.error('Failed to load Pyodide:', error);
                const outputContent = document.getElementById('outputContent');
                if (outputContent) {
                    outputContent.innerHTML = `<div class="log-line error">Failed to load Python interpreter: ${error.message}</div>`;
                }
                this.loading.python = false;
                this.callbacks.python = [];
            }
        };

        script.onerror = () => {
            console.error('Failed to load Pyodide script');
            const outputContent = document.getElementById('outputContent');
            if (outputContent) {
                outputContent.innerHTML = `<div class="log-line error">Failed to load Python interpreter</div>`;
            }
            this.loading.python = false;
            this.callbacks.python = [];
        };
    },

    /**
     * Load C/C++ WebAssembly runtime
     */
    loadCppRuntime: function () {
        // Use local C++ simulation environment (more reliable)
        const startLoad = async () => {
            try {
                // Show loading message
                const outputPanel = document.getElementById('outputPanel');
                const outputContent = document.getElementById('outputContent');
                if (outputPanel && outputContent) {
                    outputPanel.style.display = 'block';
                    outputContent.innerHTML = '<div class="log-line">Loading C/C++ compiler...</div>';
                }

                // Create our basic C++ execution environment
                this.runtimes.cpp = await this.createBasicCppEnvironment();

                // Mark as loaded
                this.loaded.cpp = true;
                this.loading.cpp = false;

                // Execute callbacks
                if (outputContent) {
                    outputContent.innerHTML += '<div class="log-line">C/C++ runtime ready!</div>';
                }

                // Execute all callbacks
                for (const callback of this.callbacks.cpp) {
                    callback(this.runtimes.cpp);
                }
                this.callbacks.cpp = [];
            } catch (error) {
                console.error('Failed to create C++ environment:', error);
                const outputContent = document.getElementById('outputContent');
                if (outputContent) {
                    outputContent.innerHTML = `<div class="log-line error">Failed to load C/C++ runtime: ${error.message}</div>`;
                }
                this.loading.cpp = false;
                this.callbacks.cpp = [];
            }
        };

        // Start loading immediately
        startLoad();
    },

    /**
     * Load Java WebAssembly runtime
     */
    loadJavaRuntime: function () {
        // Use local Java simulation environment (more reliable than CheerpJ)
        const startLoad = async () => {
            try {
                // Show loading message
                const outputPanel = document.getElementById('outputPanel');
                const outputContent = document.getElementById('outputContent');
                if (outputPanel && outputContent) {
                    outputPanel.style.display = 'block';
                    outputContent.innerHTML = '<div class="log-line">Loading Java runtime...</div>';
                }

                // Create our basic Java execution environment
                this.runtimes.java = await this.createBasicJavaEnvironment();

                // Mark as loaded
                this.loaded.java = true;
                this.loading.java = false;

                // Execute callbacks
                if (outputContent) {
                    outputContent.innerHTML += '<div class="log-line">Java runtime ready!</div>';
                }

                // Execute all callbacks
                for (const callback of this.callbacks.java) {
                    callback(this.runtimes.java);
                }
                this.callbacks.java = [];
            } catch (error) {
                console.error('Failed to create Java environment:', error);
                const outputContent = document.getElementById('outputContent');
                if (outputContent) {
                    outputContent.innerHTML = `<div class="log-line error">Failed to load Java runtime: ${error.message}</div>`;
                }
                this.loading.java = false;
                this.callbacks.java = [];
            }
        };

        // Start loading immediately
        startLoad();
    },

    /**
     * Execute Python code
     * @param {string} code - Python code to execute
     * @returns {Promise<string>} - Output of the execution
     */
    executePython: async function (code) {
        return new Promise((resolve, reject) => {
            this.loadRuntime('python', async (pyodide) => {
                try {
                    // Redirect stdout to capture output
                    pyodide.runPython(`
                        import sys
                        from io import StringIO
                        old_stdout = sys.stdout
                        old_stderr = sys.stderr
                        sys.stdout = StringIO()
                        sys.stderr = StringIO()
                    `);

                    // Run the code
                    try {
                        await pyodide.runPythonAsync(code);
                    } catch (executeError) {
                        // Don't return here, let's still try to get stderr output
                        console.log('Python execution error:', executeError);
                    }

                    // Get stdout and stderr safely
                    let stdout = "";
                    let stderr = "";

                    // Flush the output buffers first
                    try {
                        pyodide.runPython("sys.stdout.flush(); sys.stderr.flush()");
                    } catch (e) {
                        console.warn('Could not flush streams:', e);
                    }

                    try {
                        stdout = pyodide.runPython("sys.stdout.getvalue()");
                        console.log('DEBUG: Python stdout captured:', JSON.stringify(stdout), 'length:', stdout.length);
                    } catch (e) {
                        console.warn('Could not get stdout:', e);
                    }

                    try {
                        stderr = pyodide.runPython("sys.stderr.getvalue()");
                        console.log('DEBUG: Python stderr captured:', JSON.stringify(stderr), 'length:', stderr.length);
                    } catch (e) {
                        console.warn('Could not get stderr:', e);
                    }

                    console.log('DEBUG: Final Python result:', { stdout, stderr, error: !!stderr });

                    // Reset stdout and stderr
                    pyodide.runPython(`
                        sys.stdout = old_stdout
                        sys.stderr = old_stderr
                    `);

                    // Return combined output
                    if (stderr) {
                        resolve({ stdout, stderr, error: true });
                    } else {
                        resolve({ stdout, stderr: "", error: false });
                    }
                } catch (error) {
                    // Reset stdout and stderr on error
                    try {
                        pyodide.runPython(`
                            sys.stdout = old_stdout
                            sys.stderr = old_stderr
                        `);
                    } catch (e) {
                        // Ignore reset errors
                    }

                    // Get error message
                    resolve({ stdout: "", stderr: error.toString(), error: true });
                }
            });
        });
    },

    /**
     * Create a basic C++ execution environment using local simulation
     */
    createBasicCppEnvironment: async function () {
        return {
            execute: async function (code, language) {
                // Local C++ code simulation
                try {
                    return await WasmRuntime.simulateBasicCpp(code, language);
                } catch (error) {
                    return { stdout: '', stderr: error.message, success: false };
                }
            }
        };
    },

    /**
     * Create a basic Java execution environment using local simulation
     */
    createBasicJavaEnvironment: async function () {
	console.log("[JavaEnv] Creating worker…");
        const javaCompilerWorker = new Worker("/demos/code/assets/js/teaVM/customJavaWorker.js",
            { type: 'module' }
        )

        // wait 500ms for compiler to be ready
	console.log("[JavaEnv] Worker created, waiting 500ms…");
        await new Promise(resolve => setTimeout(resolve, 500));

	console.log("[JavaEnv] Wrapping worker using Comlink…");
        javaCompiler = Comlink.wrap(javaCompilerWorker);

	console.log("[JavaEnv] Loading TeaVM SDK…");
        let response = await fetch("/demos/code/assets/js/teaVM/compile-classlib-teavm.bin");
	console.log("[JavaEnv] SDK fetch completed.");
        await javaCompiler.setSdk(new Int8Array(await response.arrayBuffer()));
	console.log("[JavaEnv] SDK loaded into worker.");

	console.log("[JavaEnv] Loading TeaVM classlib…");
        response = await fetch("/demos/code/assets/js/teaVM/runtime-classlib-teavm.bin");
	console.log("[JavaEnv] Classlib fetch completed.");
        await javaCompiler.setTeaVMClasslib(new Int8Array(await response.arrayBuffer()));
	console.log("[JavaEnv] Classlib loaded into worker.");

	console.log("[JavaEnv] Java environment READY.");

        return {
            execute: async function (code) {
		console.log("========== JAVA EXECUTION START ==========");
                try {
                    stdOutValue = "";
		    console.log("[Exec] Adding source file…");
                    javaCompiler.addSourceFile("Main.java", code);

                    if (!(await javaCompiler.compile())) {
                        return { stdout: '', stderr: "Compilation failed, check browser console for more information.", success: false };
                    };

                    if (!(await javaCompiler.generateWebAssembly({
                        outputName: "app",
                        mainClass: "Main"
                    }))) {
                        return { stdout: '', stderr: "Conversion from Java Bytecode to WASM failed.", success: false };
                    };

                    let generatedWasm = await javaCompiler.getWebAssemblyOutputFile("app.wasm");

                    let outputTeaVM = await load(generatedWasm.buffer, {
                        installImports: (o) => {
                            o.teavmConsole.putcharStdout = (ch) => {
                                if (ch === 0xA) {
                                    stdOutValue += "\n";
                                } else {
                                    stdOutValue += String.fromCharCode(ch);
                                }
                            };
                            //     o.teavmConsole.putcharStderr = putStdoutJava;
                        }
                    }
                    );
                    await outputTeaVM.exports.main([]);
                    // wait 100ms for program to run
                    await new Promise(resolve => setTimeout(resolve, 100));


                    return { stdout: stdOutValue, stderr: '', success: true };
                } catch (error) {
                    return { stdout: '', stderr: error.message, success: false };
                }
            }
        };
    },

    /**
     * Execute C/C++ code
     * @param {string} code - C/C++ code to execute
     * @param {string} language - cpp or c depending on which language is being compiled
     * @returns {Promise<string>} - Output of the execution
     */
    executeCpp: async function (code, language) {
        return new Promise((resolve) => {
            this.loadRuntime('cpp', async (runtime) => {
                try {
                    // Use our local C++ simulation environment
                    const result = await runtime.execute(code, language);

                    resolve({
                        stdout: result.stdout || '',
                        stderr: result.stderr || '',
                        error: !result.success
                    });
                } catch (error) {
                    resolve({
                        stdout: '',
                        stderr: `C++ execution error: ${error.message}`,
                        error: true
                    });
                }
            });
        });
    },

    /**
     * Simulate basic C++ execution for common patterns
     */
    simulateBasicCpp: async function (code, language) {
        try {

            const output = await preCompile(code, language);


            return { stdout: output, stderr: '', success: true };
        } catch (error) {
            return { stdout: '', stderr: `Simulation error: ${error.message}`, success: false };
        }
    },



    /**
     * Execute Java code
     * @param {string} code - Java code to execute
     * @returns {Promise<string>} - Output of the execution
     */
    executeJava: async function (code) {
        return new Promise((resolve) => {
            this.loadRuntime('java', async (runtime) => {
                try {
                    // Use our local Java simulation environment
                    const result = await runtime.execute(code);

                    resolve({
                        stdout: result.stdout || '',
                        stderr: result.stderr || '',
                        error: !result.success
                    });
                } catch (error) {
                    resolve({
                        stdout: '',
                        stderr: `Java execution error: ${error.message}`,
                        error: true
                    });
                }
            });
        });
    },

    /**
     * Execute code in the specified language
     * @param {string} code - Code to execute
     * @param {string} language - Language mode
     * @returns {Promise<object>} - Result of execution
     */
    executeCode: async function (code, language) {
        switch (language) {
            case 'javascript':
                // JavaScript is executed directly
                return null;
            case 'python':
                return this.executePython(code);
            case 'c':
            case 'cpp':
                return this.executeCpp(code, language);
            case 'java':
                return this.executeJava(code);
            default:
                return {
                    stdout: "",
                    stderr: `Execution for ${language} is not supported in the browser.`,
                    error: true
                };
        }
    }
};


const emscriptenConfig =
`LLVM_ROOT      = '/usr/bin'
BINARYEN_ROOT   = '/usr'
NODE_JS         = '/usr/bin/node'
EMSCRIPTEN_ROOT = '/lazy/emscripten'
`

const tempRetContents = 
`
.globaltype tempRet0, i32
tempRet0:

.globl setTempRet0
setTempRet0:
  .functype setTempRet0 (i32) -> ()
  local.get 0
  global.set tempRet0
  end_function

.globl getTempRet0
getTempRet0:
  .functype getTempRet0 () -> (i32)
  global.get tempRet0
  end_function

# These aliases exist solely for LegalizeJSInterface pass in binaryen
# They get exported by emcc and the exports are then removed by the
# binaryen pass
.globl __get_temp_ret
.type __get_temp_ret, @function
__get_temp_ret = getTempRet0

.globl __set_temp_ret
.type __set_temp_ret, @function
__set_temp_ret = setTempRet0
`
