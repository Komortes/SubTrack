const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

// Compile an isolated copy so module-scoped queue state never leaks between tests.
// Native storage and network dependencies can be replaced at their boundaries.
function loadModule(relativePath, mocks = {}) {
  const filename = path.resolve(path.dirname(module.filename), "..", relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  const instance = new Module(filename, module);
  instance.filename = filename;
  instance.paths = Module._nodeModulePaths(path.dirname(filename));
  const requireFromSource = Module.createRequire(filename);
  instance.require = (request) =>
    Object.hasOwn(mocks, request) ? mocks[request] : requireFromSource(request);
  instance._compile(outputText, filename);
  return instance.exports;
}

module.exports = { loadModule };
