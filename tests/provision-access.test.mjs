import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, lstat, rm, chmod, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { provisionAccess } from '../scripts/provision-access.mjs';

async function fixture(run) {
 const stateDirectory=await mkdtemp(join(tmpdir(),'elo-access-synthetic-'));
 const accountId='a'.repeat(32); const state={app:undefined,secrets:new Map(),writes:0,suspended:false,name:'Synthetic Elo',providers:[{id:'synthetic-otp',type:'onetimepin'}],requests:[],createdAppOverride:{}};
 const options={token:'synthetic-admin-token',accountId,expectedAccountName:'Synthetic Elo',publicOrigin:'https://elo.example.test',workerName:'elo',stateDirectory};
 const transport=async(input,init)=>{
  const path=new URL(input).pathname.replace('/client/v4',''); let result;
  state.requests.push({path,method:init.method});
  assert.equal(init.headers.Authorization,'Bearer synthetic-admin-token');
  if(path===`/accounts/${accountId}`)result={id:accountId,name:state.name};
  else if(path==='/user')result={id:'synthetic-profile',email:'owner@example.test',suspended:state.suspended};
  else if(path===`/accounts/${accountId}/access/organizations`)result={auth_domain:'synthetic.cloudflareaccess.com'};
  else if(path===`/accounts/${accountId}/access/identity_providers` && init.method==='GET')result=state.providers;
  else if(path===`/accounts/${accountId}/access/apps` && init.method==='GET')result=state.app?[{...state.app,saas_app:{...state.app.saas_app,client_secret:undefined}}]:[];
  else if(path===`/accounts/${accountId}/access/apps` && init.method==='POST'){
   state.writes++; const body=JSON.parse(init.body);
   assert.deepEqual(body.policies[0].include,[{email:{email:'owner@example.test'}}]);
   assert.deepEqual(body.saas_app.redirect_uris,['https://elo.example.test/callback']);
   assert.deepEqual(body.saas_app.grant_types,['authorization_code_with_pkce','refresh_tokens']);
   state.app={...body,id:'synthetic-app',saas_app:{...body.saas_app,client_id:'synthetic-client',client_secret:'private-test-secret'},...state.createdAppOverride};result=state.app;
  }else if(path.endsWith('/policies'))result=state.app.policies;
  else if(path.endsWith('/secrets') && init.method==='GET')result=[...state.secrets.keys()].map(name=>({name}));
  else if(path.endsWith('/secrets') && init.method==='PUT'){state.writes++;const body=JSON.parse(init.body);state.secrets.set(body.name,body.text);result={};}
  else throw new Error(`Unexpected synthetic request ${path}`);
  return Response.json({success:true,result});
 };
 try {await run({stateDirectory,state,options,transport});} finally {await rm(stateDirectory,{recursive:true,force:true});}
}

test('creates restricted application, protects once-only secrets, resumes and preserves rotated epoch',async()=>fixture(async({stateDirectory,state,options,transport})=>{
 const result=await provisionAccess(options,transport); assert.equal(result.status,'configured');assert.equal(state.writes,5);
 assert(!JSON.stringify(result).includes('private-test-secret'));assert(!JSON.stringify(result).includes('owner@example.test'));
 assert.equal((await lstat(join(stateDirectory,'access-private.json'))).mode&0o777,0o600);
 assert.equal((await lstat(stateDirectory)).mode&0o777,0o700);
 const privateState=JSON.parse(await readFile(join(stateDirectory,'access-private.json'),'utf8'));assert.equal(privateState.clientSecret,'private-test-secret');
 state.secrets.set('AUTH_EPOCH','administratively-rotated');
 await provisionAccess(options,transport);assert.equal(state.writes,5);assert.equal(state.secrets.get('AUTH_EPOCH'),'administratively-rotated');
}));
test('refuses wrong account or suspended administrative profile before mutations',async()=>fixture(async({state,options,transport})=>{
 await assert.rejects(()=>provisionAccess({...options,expectedAccountName:'Different account'},transport));assert.equal(state.writes,0);
 state.suspended=true;await assert.rejects(()=>provisionAccess(options,transport));assert.equal(state.writes,0);
}));
test('refuses broadened policy without editing reusable policies or rewriting secrets',async()=>fixture(async({state,options,transport})=>{
 await provisionAccess(options,transport);state.app.policies[0].include=[{everyone:{}}];
 await assert.rejects(()=>provisionAccess(options,transport),/política/);assert.equal(state.writes,5);
}));
test('refuses unrecoverable private bootstrap and unsafe state-file permissions',async()=>fixture(async({stateDirectory,state,options,transport})=>{
 await provisionAccess(options,transport);
 await chmod(join(stateDirectory,'access-private.json'),0o644);await assert.rejects(()=>provisionAccess(options,transport),/0600/);assert.equal(state.writes,5);
 await rm(join(stateDirectory,'access-private.json'));state.secrets.delete('AUTH_EPOCH');await assert.rejects(()=>provisionAccess(options,transport),/estado recuperável/);assert.equal(state.writes,5);
}));
test('CLI never prints token or environment after configuration failure',()=>{
 const result=spawnSync(process.execPath,['scripts/provision-access.mjs'],{cwd:new URL('..',import.meta.url),encoding:'utf8',env:{...process.env,CLOUDFLARE_API_TOKEN:'never-print-private-token',CLOUDFLARE_ACCOUNT_ID:''}});
 assert.equal(result.status,1);assert(!`${result.stdout}${result.stderr}`.includes('never-print-private-token'));
 assert(result.stderr.includes('Nenhum segredo foi exibido'));
});

test('validates Wrangler target before any remote mutation',async()=>fixture(async({stateDirectory,state,options,transport})=>{
 const wranglerPath=join(stateDirectory,'wrong-wrangler.jsonc');await writeFile(wranglerPath,JSON.stringify({name:'other-project',account_id:options.accountId}));
 await assert.rejects(()=>provisionAccess({...options,wranglerPath},transport),/alvo autorizado/);assert.equal(state.writes,0);
}));
test('resumes connector bootstrap with public metadata and all four secret names, without reading or rewriting values',async()=>fixture(async({stateDirectory,state,options,transport})=>{
 await provisionAccess(options,transport);await rm(join(stateDirectory,'access-private.json'));
 const wranglerPath=join(stateDirectory,'wrangler.jsonc');await writeFile(wranglerPath,JSON.stringify({name:'elo',account_id:options.accountId,vars:{KEEP:'preserved'}}));
 const result=await provisionAccess({...options,wranglerPath},transport);assert.equal(state.writes,5);assert.equal(result.status,'configured');
 const vars=JSON.parse(await readFile(wranglerPath,'utf8')).vars;assert.equal(vars.ACCESS_CLIENT_ID,'synthetic-client');assert.equal(vars.KEEP,'preserved');
 const localState=JSON.parse(await readFile(join(stateDirectory,'access-private.json'),'utf8'));assert.equal(localState.externalBootstrap,true);assert(!JSON.stringify(localState).includes('private-test-secret'));assert.equal(localState.clientSecret,undefined);
 await provisionAccess({...options,wranglerPath},transport);assert.equal(state.writes,5);
}));

test('accepts actual Wrangler JSONC comments and trailing commas before target checks',async()=>fixture(async({stateDirectory,state,options,transport})=>{
 const wranglerPath=join(stateDirectory,'wrangler.jsonc');
 await writeFile(wranglerPath,`{ // supported Wrangler syntax\n"name":"elo", "account_id":"${options.accountId}", "vars":{"PRESERVED":"yes",},}`);
 await provisionAccess({...options,wranglerPath},transport);assert.equal(state.writes,5);
 const config=JSON.parse(await readFile(wranglerPath,'utf8'));assert.equal(config.vars.PRESERVED,'yes');
}));
test('rejects malformed JSONC before any Cloudflare call',async()=>fixture(async({stateDirectory,state,options})=>{
 const wranglerPath=join(stateDirectory,'bad.jsonc');await writeFile(wranglerPath,'{"name": "elo", nope}');let calls=0;
 await assert.rejects(()=>provisionAccess({...options,wranglerPath},()=>{calls++;throw new Error('must not call')}),/inválida/);assert.equal(calls,0);assert.equal(state.writes,0);
}));

test('pins creation and resume to the single OTP provider without altering global providers', async () => fixture(async ({ state, options, transport }) => {
  state.providers.push({ id: 'synthetic-google', type: 'google' });
  await provisionAccess(options, transport);
  assert.deepEqual(state.app.allowed_idps, ['synthetic-otp']);
  assert.equal(Object.hasOwn(state.app, 'allow_all_identity_providers'), false);
  await provisionAccess(options, transport);
  assert.equal(state.writes, 5);
  assert.deepEqual(state.requests.filter(r => r.path.includes('/identity_providers')).map(r => r.method), ['GET', 'GET']);
}));

for (const [label, providers] of [
  ['absent', []],
  ['only another provider', [{ id: 'synthetic-google', type: 'google' }]],
  ['ambiguous', [{ id: 'otp-one', type: 'onetimepin' }, { id: 'otp-two', type: 'onetimepin' }]],
  ['missing provider id', [{ type: 'onetimepin' }]],
]) test(`refuses ${label} OTP configuration before secrets or mutations`, async () => fixture(async ({ state, options, transport }) => {
  state.providers = providers;
  await assert.rejects(() => provisionAccess(options, transport), /OTP/);
  assert.equal(state.writes, 0);
  assert(!state.requests.some(r => r.path.endsWith('/secrets')));
}));

for (const [label, drift] of [
  ['all providers enabled', { allow_all_identity_providers: true }],
  ['provider list empty', { allowed_idps: [] }],
  ['OTP and another provider', { allowed_idps: ['synthetic-otp', 'synthetic-google'] }],
  ['another provider only', { allowed_idps: ['synthetic-google'] }],
  ['provider list omitted', { allowed_idps: undefined }],
]) test(`refuses existing application drift (${label}) without repairing or writing secrets`, async () => fixture(async ({ state, options, transport }) => {
  await provisionAccess(options, transport);
  Object.assign(state.app, drift);
  state.secrets.delete('AUTH_EPOCH');
  const before = state.requests.length;
  await assert.rejects(() => provisionAccess(options, transport), /OTP/);
  assert.equal(state.writes, 5);
  assert(!state.requests.slice(before).some(r => r.path.endsWith('/secrets') || r.method !== 'GET'));
}));

test('rejects a creation response that does not enforce the requested OTP restriction before publishing secrets', async () => fixture(async ({ state, options, transport }) => {
  state.createdAppOverride = { allow_all_identity_providers: true };
  await assert.rejects(() => provisionAccess(options, transport), /OTP/);
  assert.equal(state.writes, 1);
  assert.equal(state.secrets.size, 0);
}));
