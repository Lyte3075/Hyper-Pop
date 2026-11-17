import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

const app = express();
const PORT = Number(process.env.PORT || 10000);
const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "";
const STORAGE_URL = process.env.HP_STORAGE_URL || (SUPABASE_URL + "/functions/v1/hyperpop-node-storage");
const SETUP_KEY = process.env.HP_NODE_SETUP_KEY || "";
const ROOT = path.join(os.tmpdir(), "hyperpop-node-projects");
const NODE_UID = 1000;
const NODE_GID = 1000;
const MAX_RUNNING = 1;
const running = new Map();
const previews = new Map();
const logs = new Map();
let aptBusy = false;

app.disable("x-powered-by");
app.use((req,res,next) => {
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Authorization, Content-Type");
  res.setHeader("Access-Control-Allow-Methods","GET, POST, PUT, DELETE, OPTIONS");
  if(req.method === "OPTIONS") return res.status(204).end();
  next();
});
app.use(express.json({ limit: "300kb" }));
app.use((req,res,next) => {
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("Cache-Control","no-store");
  next();
});

function jsonError(res, status, error) { return res.status(status).json({ ok:false, error }); }
function bearer(req) {
  const m = String(req.headers.authorization || "").match(/^Bearer\s+([0-9a-f-]{36})$/i);
  return m ? m[1] : "";
}
async function verifySession(token) {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("The account connection is not configured.");
  const response = await fetch(SUPABASE_URL + "/rest/v1/rpc/hyperpop_me", {
    method:"POST",
    headers:{ apikey:SUPABASE_KEY, "Content-Type":"application/json" },
    body:JSON.stringify({p_token:token}),
    signal:AbortSignal.timeout(6000)
  });
  if (!response.ok) throw new Error("Hyper-Pop account verification failed.");
  const data = await response.json();
  return data?.ok && data?.id ? {id:String(data.id),username:String(data.username || "")} : null;
}
async function storage(token, body) {
  const response = await fetch(STORAGE_URL, {
    method:"POST",
    headers:{ apikey:SUPABASE_KEY, authorization:"Bearer " + token, "Content-Type":"application/json" },
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(10000)
  });
  const data = await response.json().catch(()=>({ok:false,error:"Persistent storage returned an invalid response."}));
  if (!response.ok || !data.ok) {
    const error = new Error(data.error || "Persistent storage request failed.");
    error.status = response.status || 502;
    throw error;
  }
  return data;
}
async function auth(req,res,next) {
  try {
    const token = bearer(req);
    if (!token) return jsonError(res,401,"Sign in to Hyper-Pop to use your Node server.");
    const user = await verifySession(token);
    if (!user) return jsonError(res,401,"Your Hyper-Pop session has expired. Sign in again.");
    req.hpUser = user;
    req.hpToken = token;
    next();
  } catch (error) { jsonError(res,502,error.message || "Could not verify your account."); }
}
function safeSlug(value) {
  const slug = String(value || "").toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) throw new Error("Use lowercase letters, numbers, and hyphens for project names.");
  return slug;
}
function safePath(value) {
  const file = String(value || "").replace(/^\.\//,"");
  if (!file || file.length > 512 || file.startsWith("/") || file.includes("\\") ||
      file.split("/").some(part => !part || part === "." || part === "..") || /[\u0000-\u001f]/.test(file)) {
    throw new Error("Invalid project file path.");
  }
  return file;
}
function projectDir(slug) { return path.join(ROOT,slug); }
async function writeProjectFile(slug, file, content) {
  const safe = safePath(file);
  const base = projectDir(slug);
  const destination = path.resolve(base,safe);
  if (!destination.startsWith(base + path.sep)) throw new Error("Invalid project path.");
  await fs.mkdir(path.dirname(destination),{recursive:true});
  await fs.writeFile(destination,String(content),"utf8");
}
async function ensureNodeOwnership(slug) {
  const base = projectDir(slug);
  async function visit(target) {
    const stat = await fs.stat(target);
    if (stat.isDirectory()) {
      for (const entry of await fs.readdir(target)) await visit(path.join(target,entry));
      await fs.chown(target,NODE_UID,NODE_GID);
      await fs.chmod(target,0o775);
    } else {
      await fs.chown(target,NODE_UID,NODE_GID);
      await fs.chmod(target,0o664);
    }
  }
  await visit(base);
}
async function syncProject(token,slug) {
  const data = await storage(token,{action:"list-files",slug});
  await fs.rm(projectDir(slug),{recursive:true,force:true});
  await fs.mkdir(projectDir(slug),{recursive:true});
  for (const file of data.files || []) {
    const row = await storage(token,{action:"get-file",slug,path:file.path});
    await writeProjectFile(slug,file.path,row.file.content);
  }
  await ensureNodeOwnership(slug);
  return data.files || [];
}
function projectState(slug) {
  const child = running.get(slug);
  return { running:!!child && child.exitCode === null, port:child?.hpPort || null, previewUrl:child?.hpPreviewUrl || null };
}
function appendLog(slug,chunk) {
  const previous = logs.get(slug) || "";
  logs.set(slug,(previous + String(chunk)).slice(-20000));
}
function runNpm(slug,args,timeoutMs=180000) {
  return new Promise((resolve,reject) => {
    const child = spawn("npm",args,{cwd:projectDir(slug),uid:NODE_UID,gid:NODE_GID,env:{PATH:process.env.PATH||"",HOME:projectDir(slug),TMPDIR:os.tmpdir(),CI:"1",FORCE_COLOR:"0",NODE_ENV:"production"},stdio:["ignore","pipe","pipe"],shell:false});
    let output = "";
    const collect = data => { output += data.toString(); output = output.slice(-20000); appendLog(slug,data.toString()); };
    child.stdout.on("data",collect); child.stderr.on("data",collect);
    const timer = setTimeout(()=>{child.kill("SIGTERM");reject(new Error("The npm command timed out."));},timeoutMs);
    child.on("error",error=>{clearTimeout(timer);reject(error);});
    child.on("close",code=>{clearTimeout(timer);resolve({code,output});});
  });
}
app.get("/health",(req,res)=>res.json({ok:true,service:"hyperpop-node-server",runtime:process.version,projects:"persistent"}));
app.get("/api/me",auth,async(req,res)=>{
  try {
    const data = await storage(req.hpToken,{action:"list-projects"});
    res.json({ok:true,claimed:true,username:req.hpUser.username,projects:data.projects.map(p=>({...p,...projectState(p.slug)}))});
  } catch(error) {
    if (error.status === 423) return res.json({ok:true,claimed:false,username:req.hpUser.username});
    jsonError(res,error.status || 502,error.message);
  }
});
app.post("/api/claim",auth,async(req,res)=>{
  try {
    if (!SETUP_KEY || String(req.body?.setupKey || "") !== SETUP_KEY) return jsonError(res,403,"The one-time setup key is incorrect.");
    const result = await storage(req.hpToken,{action:"claim",claimKey:SETUP_KEY});
    res.json(result);
  } catch(error) { jsonError(res,error.status || 502,error.message); }
});
app.use("/api",auth);
app.post("/api/system/apt",async(req,res)=>{
  const action=String(req.body?.action||"").toLowerCase();
  const packages=Array.isArray(req.body?.packages)?req.body.packages.map(x=>String(x)):[];
  const validPackage=/^[a-z0-9][a-z0-9+.-]*(?::[a-z0-9]+)?(?:=[A-Za-z0-9.+:~_-]+)?$/;
  let args;
  if(action==="update"&&packages.length===0) args=["update"];
  else if(action==="upgrade"&&packages.length===0) args=["upgrade","-y"];
  else if((action==="install"||action==="remove")&&packages.length>0&&packages.length<=8&&packages.every(p=>validPackage.test(p))) {
    args=[action,"-y",...(action==="install"?["--no-install-recommends"]:[]),...packages];
  } else {
    return jsonError(res,400,"Use apt update, apt upgrade, apt install <package>, or apt remove <package>. Package names only; up to 8 at a time.");
  }
  if(aptBusy) return jsonError(res,409,"Another APT operation is already running. Wait for it to finish.");
  aptBusy=true;
  try {
    const root=typeof process.getuid==="function"&&process.getuid()===0;
    const executable=root?"apt-get":"sudo";
    const commandArgs=root?args:["-n","apt-get",...args];
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(executable,commandArgs,{env:{...process.env,DEBIAN_FRONTEND:"noninteractive"},stdio:["ignore","pipe","pipe"],shell:false});
      let output="",finished=false;
      const collect=chunk=>{output=(output+chunk.toString()).slice(-30000);};
      child.stdout.on("data",collect);child.stderr.on("data",collect);
      const finish=fn=>{if(finished)return;finished=true;clearTimeout(timer);fn();};
      const timer=setTimeout(()=>{child.kill("SIGTERM");finish(()=>reject(new Error("APT timed out after 2 minutes. The package operation may need a smaller install.")));},120000);
      child.on("error",error=>finish(()=>reject(new Error(
        error.code==="ENOENT"
          ?(root?"apt-get is not available in this Render runtime.":"This Render runtime does not expose apt-get or passwordless sudo. Configure OS packages at build time or use a Docker runtime.")
          :"Could not start APT: "+error.message
      ))));
      child.on("close",code=>finish(()=>resolve({code:code??1,output})));
    });
    res.json({ok:true,commandOk:result.code===0,code:result.code,output:result.output});
  } catch(error) {
    jsonError(res,503,error.message||"APT is unavailable in this Render runtime.");
  } finally {
    aptBusy=false;
  }
});
const REMOTE_COMMANDS = new Set([
  "cowsay","cowthink","python3","python","pip3","pip",
  "git","curl","wget","ffmpeg","tree","unzip","zip","tar",
  "grep","egrep","fgrep","sed","awk","find","ls","cat","head","tail",
  "wc","sort","uniq","cut","tr","base64","sha256sum","file","du","df",
  "uname","whoami","id","hostname","date","uptime","free","env","printenv","which",
  "printf","seq","rev","nl","cmp","diff","realpath","basename","dirname"
]);
app.post("/api/system/exec",async(req,res)=>{
  const command=String(req.body?.command||"");
  const args=Array.isArray(req.body?.args)?req.body.args.map(x=>String(x)):null;
  if(!REMOTE_COMMANDS.has(command)) return jsonError(res,403,"That Linux command is not enabled on the personal server.");
  if(!args||args.length>40||args.some(x=>x.length>2048||x.includes("\\0"))) return jsonError(res,400,"Invalid command arguments.");
  const result=await new Promise(resolve=>{
    let output="",finished=false;
    const child=spawn(command,args,{
      cwd:"/home/node",
      uid:NODE_UID,
      gid:NODE_GID,
      env:{PATH:"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games",HOME:"/home/node",TMPDIR:os.tmpdir(),LANG:"C.UTF-8",FORCE_COLOR:"0"},
      stdio:["ignore","pipe","pipe"],
      shell:false
    });
    const collect=chunk=>{output=(output+chunk.toString()).slice(-30000);};
    child.stdout.on("data",collect);child.stderr.on("data",collect);
    const finish=value=>{if(finished)return;finished=true;clearTimeout(timer);resolve(value);};
    const timer=setTimeout(()=>{child.kill("SIGTERM");finish({code:124,output:output+"\\nCommand timed out after 30 seconds."});},30000);
    child.on("error",error=>finish({code:127,output:output+(output?"\\n":"")+(error.code==="ENOENT"?"Command not found on the Render server.":error.message)}));
    child.on("close",code=>finish({code:code??1,output}));
  });
  res.json({ok:true,code:result.code,output:result.output});
});
app.get("/api/projects",async(req,res)=>{
  try { const data=await storage(req.hpToken,{action:"list-projects"}); res.json({ok:true,projects:data.projects.map(p=>({...p,...projectState(p.slug)}))}); }
  catch(error){jsonError(res,error.status||502,error.message);}
});
app.post("/api/projects",async(req,res)=>{
  try {
    const slug=safeSlug(req.body?.slug);
    const name=String(req.body?.name||slug).slice(0,80);
    const data=await storage(req.hpToken,{action:"create-project",slug,name});
    await fs.mkdir(projectDir(slug),{recursive:true});
    const packageJson=JSON.stringify({name:slug,version:"1.0.0",private:true,scripts:{start:"node index.js"},dependencies:{express:"^5.1.0"}},null,2);
    const starter='const express = require("express");\nconst app = express();\napp.get("/", (req,res) => res.send("<h1>It works! 🚀</h1><p>Your Hyper-Pop Node.js project is running.</p>"));\nconst port = process.env.PORT || 3000;\napp.listen(port, "0.0.0.0", () => console.log("Project listening on " + port));\n';
    await storage(req.hpToken,{action:"put-file",slug,path:"package.json",content:packageJson});
    await storage(req.hpToken,{action:"put-file",slug,path:"index.js",content:starter});
    await writeProjectFile(slug,"package.json",packageJson);
    await writeProjectFile(slug,"index.js",starter);
    await ensureNodeOwnership(slug);
    res.status(201).json({ok:true,project:data.project});
  } catch(error){jsonError(res,error.status||400,error.message);}
});
app.delete("/api/projects/:slug",async(req,res)=>{
  try {
    const slug=safeSlug(req.params.slug);
    await stopProject(slug);
    await storage(req.hpToken,{action:"delete-project",slug});
    await fs.rm(projectDir(slug),{recursive:true,force:true});
    res.json({ok:true,deleted:slug});
  } catch(error){jsonError(res,error.status||400,error.message);}
});
app.get("/api/projects/:slug/files",async(req,res)=>{
  try {
    const slug=safeSlug(req.params.slug);
    if (req.query.path) {
      const file=await storage(req.hpToken,{action:"get-file",slug,path:safePath(req.query.path)});
      return res.json({ok:true,file:file.file});
    }
    const data=await storage(req.hpToken,{action:"list-files",slug});
    res.json({ok:true,files:data.files});
  } catch(error){jsonError(res,error.status||400,error.message);}
});
app.put("/api/projects/:slug/files",async(req,res)=>{
  try {
    const slug=safeSlug(req.params.slug), file=safePath(req.body?.path), content=String(req.body?.content??"");
    await storage(req.hpToken,{action:"put-file",slug,path:file,content});
    await writeProjectFile(slug,file,content);
    await ensureNodeOwnership(slug);
    res.json({ok:true,path:file});
  } catch(error){jsonError(res,error.status||400,error.message);}
});
app.delete("/api/projects/:slug/files",async(req,res)=>{
  try {
    const slug=safeSlug(req.params.slug), file=safePath(req.body?.path);
    await storage(req.hpToken,{action:"delete-file",slug,path:file});
    await fs.rm(path.join(projectDir(slug),file),{force:true});
    res.json({ok:true,path:file});
  } catch(error){jsonError(res,error.status||400,error.message);}
});
app.post("/api/projects/:slug/install",async(req,res)=>{
  try {
    const slug=safeSlug(req.params.slug);
    await syncProject(req.hpToken,slug);
    const result=await runNpm(slug,["install"],180000);
    res.json({ok:result.code===0,code:result.code,output:result.output});
  } catch(error){jsonError(res,error.status||500,error.message);}
});
async function stopProject(slug) {
  const child=running.get(slug);
  if (!child) return;
  child.kill("SIGTERM");
  await new Promise(resolve=>setTimeout(resolve,1200));
  if (child.exitCode===null) child.kill("SIGKILL");
  running.delete(slug); previews.delete(slug);
}
app.post("/api/projects/:slug/start",async(req,res)=>{
  try {
    const slug=safeSlug(req.params.slug);
    await syncProject(req.hpToken,slug);
    const active=[...running.entries()].filter(([,p])=>p.exitCode===null && p.hpSlug!==slug);
    if (active.length>=MAX_RUNNING) return jsonError(res,429,"The free personal server runs one project at a time. Stop the other project first.");
    if (running.has(slug)) await stopProject(slug);
    const files=await fs.readdir(projectDir(slug));
    if (!files.includes("package.json")) return jsonError(res,400,"This project has no package.json.");
    const port=3100 + (Math.abs([...slug].reduce((a,c)=>a+c.charCodeAt(0),0)) % 1000);
    const packageJson=JSON.parse(await fs.readFile(path.join(projectDir(slug),"package.json"),"utf8"));
    const startCommand=String(packageJson.scripts?.start||"node index.js");
    const parts=startCommand.match(/(?:[^\s"]+|"[^"]*")+/g)||[];
    const command=parts.shift();
    const args=parts.map(x=>x.replace(/^"|"$/g,""));
    if (!command || !/^(node|npm)$/.test(command)) return jsonError(res,400,"Start scripts must begin with node or npm.");
    if (!await fs.stat(path.join(projectDir(slug),"node_modules")).then(()=>true).catch(()=>false)) {
      const install = await runNpm(slug,["install"],180000);
      if (install.code !== 0) return jsonError(res,500,"npm install failed before startup. Check node logs for output.");
    }
    const child=spawn(command,args,{cwd:projectDir(slug),uid:NODE_UID,gid:NODE_GID,env:{PATH:process.env.PATH||"",HOME:projectDir(slug),TMPDIR:os.tmpdir(),PORT:String(port),HOST:"127.0.0.1",NODE_ENV:"production"},stdio:["ignore","pipe","pipe"],shell:false});
    child.hpSlug=slug; child.hpPort=port;
    const previewKey=randomBytes(24).toString("hex");
    const base=process.env.RENDER_EXTERNAL_URL || ("https://" + req.get("host"));
    child.hpPreviewUrl=base+"/preview/"+encodeURIComponent(slug)+"/?key="+previewKey;
    running.set(slug,child); previews.set(slug,previewKey); logs.set(slug,"");
    child.stdout.on("data",d=>appendLog(slug,d)); child.stderr.on("data",d=>appendLog(slug,d));
    child.on("exit",()=>{if(running.get(slug)===child){running.delete(slug);previews.delete(slug);}});
    await new Promise(resolve=>setTimeout(resolve,900));
    if(child.exitCode!==null) return jsonError(res,500,"The project exited during startup. Check its logs.");
    res.json({ok:true,slug,port,previewUrl:child.hpPreviewUrl});
  } catch(error){jsonError(res,error.status||500,error.message);}
});
app.post("/api/projects/:slug/stop",async(req,res)=>{
  try {const slug=safeSlug(req.params.slug);await stopProject(slug);res.json({ok:true,stopped:slug});}
  catch(error){jsonError(res,400,error.message);}
});
app.get("/api/projects/:slug/status",async(req,res)=>{
  try {const slug=safeSlug(req.params.slug);res.json({ok:true,...projectState(slug),logs:logs.get(slug)||""});}
  catch(error){jsonError(res,400,error.message);}
});
app.post("/api/projects/:slug/npm",async(req,res)=>{
  try {
    const slug=safeSlug(req.params.slug), action=String(req.body?.action||"");
    if(action==="install"){await syncProject(req.hpToken,slug);const r=await runNpm(slug,["install"],180000);return res.json({ok:r.code===0,...r});}
    if(action==="run"){
      const script=String(req.body?.script||"");
      if(!/^[a-zA-Z0-9:_-]{1,64}$/.test(script)) return jsonError(res,400,"Invalid npm script name.");
      const r=await runNpm(slug,["run",script],120000);return res.json({ok:r.code===0,...r});
    }
    jsonError(res,400,"Use action install or run.");
  } catch(error){jsonError(res,error.status||500,error.message);}
});
app.use("/preview/:slug",(req,res)=>{
  const slug=String(req.params.slug||"");
  const child=running.get(slug), expected=previews.get(slug);
  if(!child || child.exitCode!==null || !expected) return jsonError(res,503,"This preview is not running. Start the project from Hyper-Pop Terminal.");
  if(String(req.query.key||"")!==expected) return jsonError(res,401,"This preview link is private or has expired.");
  const target=new URL(req.originalUrl.replace(/^\/preview\/[^/]+/,"")||"/","http://127.0.0.1:"+child.hpPort);
  target.searchParams.delete("key");
  const headers={...req.headers,host:"127.0.0.1:"+child.hpPort};
  delete headers.authorization;
  const proxy=http.request({hostname:"127.0.0.1",port:child.hpPort,path:target.pathname+target.search,method:req.method,headers},upstream=>{
    res.status(upstream.statusCode||502);
    for(const [name,value] of Object.entries(upstream.headers)) if(value!==undefined) res.setHeader(name,value);
    upstream.pipe(res);
  });
  proxy.on("error",()=>{if(!res.headersSent)jsonError(res,502,"The project preview could not be reached.");});
  req.pipe(proxy);
});
app.use((req,res)=>jsonError(res,404,"Route not found."));
app.listen(PORT,"0.0.0.0",()=>console.log("Hyper-Pop personal Node server listening on "+PORT));