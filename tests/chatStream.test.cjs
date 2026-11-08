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

test('history lookup sends only selected records, stops after two pages, and aborts continuation', () => {
  const requests = [];
  class XHR {
    constructor() { requests.push(this); }
    open() {} setRequestHeader() {}
    send(body) { this.body = JSON.parse(body); }
    abort() { this.aborted = true; }
  }
  const api = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../services/chatApi.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,
    {exports:api,XMLHttpRequest:XHR,require:()=>({getApiEndpoint:p=>p})});
  const errors = [];
  const handle = api.streamChatMessage('token',[{role:'user',content:'Old squat history?'}],{
    onToken:()=>{},onDone:()=>{},onError:e=>errors.push(e),
  },{aiDataConsent:true,historyLookup:q=>({selected:q.exercise})});
  function respond(request) {
    request.status=200;request.readyState=4;
    request.responseText=JSON.stringify({type:'history_request',query:{exercise:'Squat'}})+'\n';
    request.onreadystatechange();
  }
  assert.equal(requests[0].body.historyResults,undefined);
  respond(requests[0]);
  assert.deepEqual(requests[1].body.historyResults,[{selected:'Squat'}]);
  respond(requests[1]);
  assert.equal(requests[2].body.historyAvailable,false);
  respond(requests[2]);assert.equal(requests.length,3);assert.equal(errors.length,1);
  handle.abort();assert.ok(requests[2].aborted);
});
