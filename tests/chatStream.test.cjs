const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('streaming tokens survive network chunks that split JSON lines', () => {
  let request;
  class XHR {
    constructor() {
      request = this;
    }
    open() {}
    setRequestHeader() {}
    send() {}
    abort() {}
  }
  const api = {};
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(require.resolve('../services/chatApi.ts'), 'utf8'),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } }
    ).outputText,
    {
      exports: api,
      XMLHttpRequest: XHR,
      require: () => ({ getApiEndpoint: p => p }),
    }
  );
  const tokens = [],
    done = [];
  api.streamChatMessage(
    'token',
    [],
    {
      onToken: value => tokens.push(value),
      onDone: value => done.push(value),
      onError: value => assert.fail(value),
    },
    { aiDataConsent: true }
  );
  const stream =
    JSON.stringify({ type: 'token', content: 'Hello' }) +
    '\n' +
    JSON.stringify({ type: 'token', content: ' world' }) +
    '\n' +
    JSON.stringify({ type: 'done', content: 'Hello world', activities: [] });
  request.status = 200;
  request.responseText = '';
  for (let i = 0; i < stream.length; i += 3) {
    request.responseText += stream.slice(i, i + 3);
    request.readyState = i + 3 >= stream.length ? 4 : 3;
    request.onreadystatechange();
  }
  assert.deepEqual(tokens, ['Hello', ' world']);
  assert.deepEqual(done, ['Hello world']);
});
