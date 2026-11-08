const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
module.exports = function loader(mocks = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const mod = { exports: {} };
    cache.set(file, mod);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText;
    vm.runInThisContext('(function(require,module,exports){' + code + '\n})', {
      filename: file,
    })(
      name => {
        if (name in mocks) return mocks[name];
        return name.startsWith('.')
          ? load(path.resolve(path.dirname(file), name) + '.ts')
          : require(name);
      },
      mod,
      mod.exports
    );
    return mod.exports;
  }
  return load;
};
