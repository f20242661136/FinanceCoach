const {readFileSync,existsSync}=require('node:fs');
const {resolve,dirname}=require('node:path');
const ts=require('typescript');
exports.createLoader=(project,overrides={})=>{
 const loaded=new Map();
 function load(name){
  if(overrides[name])return overrides[name];
  const file=resolve(project,'src',name);
  if(loaded.has(file))return loaded.get(file).exports;
  const module={exports:{}};loaded.set(file,module);
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  function req(id){
   if(overrides[id])return overrides[id];
   const path=id.startsWith('@/')?resolve(project,'src',id.slice(2)):id.startsWith('.')?resolve(dirname(file),id):null;
   if(path)return load(existsSync(path+'.ts')?path+'.ts':path+'.tsx');
   return require(id);
  }
  new Function('require','module','exports',code)(req,module,module.exports);return module.exports;
 }
 return load;
};
