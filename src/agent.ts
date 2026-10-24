import {query,type Options} from "@anthropic-ai/claude-agent-sdk";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {resolve,relative} from "node:path";
import {fileURLToPath} from "node:url";
import {randomUUID,createHash} from "node:crypto";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import type {RunConfig,Mode,LabEvent} from "./protocol.js";
export type {RunConfig,LabEvent} from "./protocol.js";
export const ROOT=fileURLToPath(new URL("../",import.meta.url));
export const MODEL=process.env.CLAUDE_MODEL || "claude-sonnet-4-6";
export const DESCRIPTION="Run a read-only security vulnerability scan of the classroom JavaScript sample for SQL injection, XSS, training-token placeholders and insecure configuration.";
export const TUNED_DESCRIPTION="Use for a JavaScript security review checking query concatenation, HTML output, training-token placeholders and cookie configuration in scan/app.js.";
export const DEFAULT_CONFIG:RunConfig={mode:"dispatch",description:DESCRIPTION};
export const MODES:Mode[]=["dispatch","auto","frontmatter","personal","missing","release","tuned"];
export const MARKERS=["SECURITY-SKILL-18","RELEASE-SKILL-18"];
export const PROMPTS={
 tunedDescription:TUNED_DESCRIPTION,
 dispatch:"/security-check Review the classroom sample only.",
 auto:"Check this classroom JavaScript project for security issues. Use the matching available skill workflow, then inspect the sample. Keep the report brief; do not modify files or run commands.",
 plain:"Read scan/app.js and briefly describe two visible issues. Do not invoke skills, read instruction files, edit anything, run commands or claim tests ran.",
 release:"/release-notes Summarize the recorded classroom Git commits.",
};
export function validateConfig(value:unknown):RunConfig {
 if(!value || typeof value!=="object" || Array.isArray(value))throw new Error("Send an authoring configuration.");
 const v=value as RunConfig;
 if(!MODES.includes(v.mode) || typeof v.description!=="string" || v.description.trim().length<20 || v.description.length>400 || /[\r\n`]/.test(v.description))
  throw new Error("Choose a listed mode and a single-line description of 20–400 characters without backticks.");
 return {mode:v.mode,description:v.description.trim()};
}
export function skillMarkdown(c:RunConfig,cwd?:string) {
 const approvals=c.mode==="frontmatter" ? "allowed-tools: Read, Grep, Glob\n" : "";
 const target=cwd ? resolve(cwd,"scan/app.js").replaceAll("\\","/") : "scan/app.js";
 const scan=cwd ? resolve(cwd,"scan").replaceAll("\\","/") : "scan";
 return `---\nname: security-check\ndescription: ${JSON.stringify(c.description)}\n${approvals}---\n\nRead this exact file: ${JSON.stringify(target)}. It is a deliberately flawed classroom fixture.\nDo not resolve the target relative to the skill directory. If the read fails, report that failure; never invent code, findings or line numbers.\nCheck SQL concatenation, unescaped HTML output, the fake training-token placeholder and insecure cookie/debug configuration.\nGive four short numbered findings with a file/line reference and a brief suggested fix. This is a teaching review, not a comprehensive audit.\nIf searching, use Grep with path ${JSON.stringify(target)} or Glob with path ${JSON.stringify(scan)} and pattern *.js.\nNever run code, edit files, fetch SKILL.md with Read or claim tests ran.\nEnd with SECURITY-SKILL-18.\n`;
}
export const RELEASE_SKILL=`---
name: release-notes
description: Summarize recent classroom Git commits into concise release notes using commit-history.json.
---
Read commit-history.json, which the host exported from actual Git log.
Summarize both commits with their recorded short hash and subject, using two brief bullets.
Do not run commands, read other files, edit anything or claim tests ran.
End with RELEASE-SKILL-18.
`;
export function directories(c:RunConfig,id:string) {
 const root=resolve(ROOT,".runtime",c.mode,id);
 return {cwd:resolve(root,"project"),home:resolve(root,"home"),sdkHome:resolve(root,"sdk-home")};
}
const execute=promisify(execFile);
export async function classroomHistory(cwd:string) {
 const git=(...args:string[])=>execute("git",args,{cwd,windowsHide:true});
 await git("init","-q");
 for(const [subject,contents] of [["Add catalogue endpoint","# Classroom changes\nCatalogue endpoint added.\n"],["Document authentication boundary","# Classroom changes\nCatalogue endpoint added.\nAuthentication boundary documented.\n"]]) {
  await writeFile(resolve(cwd,"CHANGES.md"),contents);await git("add","--","CHANGES.md");
  await git("-c","user.name=Classroom","-c","user.email=classroom@example.invalid","-c","commit.gpgsign=false","commit","-q","-m",subject);
 }
 const {stdout}=await git("log","-2","--format=%h%x09%s");
 return stdout.trim().split("\n").map(line=>{const [hash,subject]=line.trim().split("\t");return {hash,subject};});
}
export async function prepareWorkspace(c:RunConfig,id:string) {
 const d=directories(c,id),base=c.mode==="personal" ? resolve(d.sdkHome,"skills") : resolve(d.cwd,".claude/skills");
 for(const dir of [d.cwd,d.home,d.sdkHome,resolve(d.cwd,"scan"),resolve(base,"security-check"),resolve(base,"release-notes")])await mkdir(dir,{recursive:true});
 const prefix=c.mode==="personal" ? "private-user/skills" : "project/.claude/skills";
 const files=[
  {name:prefix+"/security-check/SKILL.md",path:resolve(base,"security-check/SKILL.md"),contents:skillMarkdown(c,d.cwd)},
  {name:prefix+"/release-notes/SKILL.md",path:resolve(base,"release-notes/SKILL.md"),contents:RELEASE_SKILL.replace("Read commit-history.json",`Read this exact file: ${JSON.stringify(resolve(d.cwd,"commit-history.json").replaceAll("\\","/"))}`).replace("Summarize both commits", "Do not resolve paths relative to the skill directory. If reading fails, report failure and do not invent commit data.\nSummarize both commits")},
 ];
 for(const file of files)await writeFile(file.path,file.contents);
 await writeFile(resolve(d.cwd,"scan/app.js"),`// Intentionally flawed training sample. Never served or executed.
export function findUser(req) {
  const sql = "SELECT * FROM users WHERE name = '" + req.query.name + "'";
  return { sql }; // Teaching SQL string only; no database is connected.
}
export function greeting(req, res) {
  res.send("<h1>" + req.query.name + "</h1>");
}
export const TRAINING_TOKEN = "TRAINING_ONLY_NOT_A_REAL_SECRET";
export const config = { debug: true, cookie: { httpOnly: false, secure: false } };
`);
 const commits=c.mode==="release" ? await classroomHistory(d.cwd) : [];
 await writeFile(resolve(d.cwd,"commit-history.json"),JSON.stringify(commits,null,2));
 return {files,commits};
}
export function toolAllowed(cwd:string,name:string,input:Record<string,unknown>) {
 if(name==="Skill")return ["security-check","release-notes"].includes(String(input.skill));
 if(name==="Read" && typeof input.file_path==="string")return ["scan/app.js","commit-history.json"].some(file=>resolve(cwd,input.file_path as string).toLowerCase()===resolve(cwd,file).toLowerCase());
 if(name==="Grep" && typeof input.path==="string")return resolve(cwd,input.path).toLowerCase()===resolve(cwd,"scan/app.js").toLowerCase();
 if(name==="Glob" && typeof input.path==="string")return resolve(cwd,input.path).toLowerCase()===resolve(cwd,"scan").toLowerCase() && input.pattern==="*.js";
 return false;
}
export function lessonOptions(c:RunConfig,id:string,completedTools:{name:string;target:string}[],permissionRequests:string[],controller=new AbortController()):Options {
 const d=directories(c,id),env={...process.env};
 for(const key of ["CLAUDE_CODE_DISABLE_CLAUDE_MDS","CLAUDE_CODE_DISABLE_ATTACHMENTS","OTEL_LOG_RAW_API_BODIES"])delete env[key];
 return {
  model:MODEL,cwd:d.cwd,env:{...env,HOME:d.home,USERPROFILE:d.home,CLAUDE_CONFIG_DIR:d.sdkHome,
   CLAUDE_CODE_DISABLE_AUTO_MEMORY:"1",ENABLE_CLAUDEAI_MCP_SERVERS:"false"},
  settingSources:c.mode==="missing" ? [] : c.mode==="personal" ? ["user"] : ["project"],skills:"all",
  tools:["Read","Grep","Glob","Skill"],
  allowedTools:c.mode==="frontmatter" ? ["Skill"] : ["Read","Grep","Glob","Skill"],
  disallowedTools:["Bash","Write","Edit","WebFetch","WebSearch"],
  systemPrompt:{type:"preset",preset:"claude_code",append:"Use the matching classroom skill when requested and available. Inspect only the authored training files. Never run code, modify files, fetch instruction files with Read or claim a comprehensive audit or completed tests. Keep answers brief."},
  strictMcpConfig:true,mcpServers:{},plugins:[],persistSession:false,
  effort:"low",thinking:{type:"disabled"},maxTurns:8,maxBudgetUsd:0.4,abortController:controller,
  hooks:{
   PreToolUse:[{hooks:[async input=>{
    if(input.hook_event_name==="PreToolUse" && !toolAllowed(d.cwd,input.tool_name,input.tool_input as Record<string,unknown>))
     return {hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"Only the authored classroom skills and exact training file targets are supported."}};
    return {};
   }]}],
   PostToolUse:[{hooks:[async input=>{
    if(input.hook_event_name==="PostToolUse") {
     const v=input.tool_input as Record<string,unknown>;
     const target=input.tool_name==="Skill" ? String(v.skill) : relative(d.cwd,resolve(d.cwd,String(v.file_path || v.path || "."))).replaceAll("\\","/");
     completedTools.push({name:input.tool_name,target});
    }
    return {};
   }]}],
  },canUseTool:async name=>{
   permissionRequests.push(name);
   return {behavior:"deny",message:"This classroom app does not approve additional tool requests. Configure the intended pre-approval method."};
  },
 };
}
export function redact(text:string) {
 const key=process.env.ANTHROPIC_API_KEY;
 return (key ? text.split(key).join("[REDACTED]") : text).replace(/sk-ant-[A-Za-z0-9_-]{16,}/g,"[REDACTED]").slice(0,16000);
}
export function hasRequiredRead(mode:Mode,tools:{name:string;target:string}[]) {
 const required=mode==="release" ? "commit-history.json" : "scan/app.js";
 return tools.some(t=>t.name==="Read" && t.target===required);
}
export async function runAgent(c:RunConfig,emit:(e:LabEvent)=>void,controller=new AbortController()) {
 c=validateConfig(c);const id=randomUUID(),{files,commits}=await prepareWorkspace(c,id);
 const digest=(s:string)=>createHash("sha256").update(s).digest("hex"),before=files.map(f=>digest(f.contents));
 const completedTools:{name:string;target:string}[]=[],permissionRequests:string[]=[],options=lessonOptions(c,id,completedTools,permissionRequests,controller);
 emit({type:"fixtures",files:files.map(({name,contents})=>({name,contents}))});
 emit({type:"options",config:c,options:{model:MODEL,settingSources:options.settingSources,skills:options.skills,tools:options.tools,allowedTools:options.allowedTools,
  approvalMethod:c.mode==="frontmatter" ? "SKILL.md allowed-tools" : "query allowedTools",description:c.description,cwd:"owned classroom project"}});
 const prompt=c.mode==="release" ? PROMPTS.release : c.mode==="missing" ? PROMPTS.plain : ["auto","tuned"].includes(c.mode) ? PROMPTS.auto : PROMPTS.dispatch;
 let text="",initSkills:string[]=[],gotResult=false;
 const run=query({prompt,options});
 try {
  for await(const message of run) {
   emit({type:"message",sdkType:message.type,summary:"subtype" in message ? String(message.subtype) : "Actual SDK message"});
   if(message.type==="system" && message.subtype==="init") {
    initSkills=message.skills;
    emit({type:"initialized",model:message.model,sessionId:message.session_id,skills:message.skills,slashCommands:message.slash_commands});
   }
   if(message.type==="assistant")for(const block of message.message.content) {
    if(block.type==="text")emit({type:"answer",text:redact(block.text)});
    if(block.type==="tool_use") {const v=block.input as Record<string,unknown>;emit({type:"tool",name:block.name,target:block.name==="Skill" ? String(v.skill) : "classroom training file"});}
   }
   if(message.type==="result") {
    gotResult=true;text=redact(message.subtype==="success" ? message.result : message.errors.join("\n"));
    const sdkStatus=message.subtype==="success" && message.is_error ? "error" : message.subtype;
    const verified=hasRequiredRead(c.mode,completedTools);
    if(sdkStatus==="success" && !verified)emit({type:"notice",text:"Host verification failed: the required data file was not successfully read. The actual model text is retained, but its findings are unverified."});
    emit({type:"result",status:sdkStatus==="success" && !verified ? "unverified_missing_read" : sdkStatus,sdkStatus,text,sessionId:message.session_id,costUsd:message.total_cost_usd});
   }
  }
  if(!gotResult)throw new Error("No typed SDK result received.");
 }finally{run.close();}
 const savedFilesUnchanged=(await Promise.all(files.map(async(f,i)=>digest(await readFile(f.path,"utf8"))===before[i]))).every(Boolean);
 emit({type:"evidence",mode:c.mode,initSkills,completedTools,returnedMarkers:MARKERS.filter(m=>text.includes(m)),permissionRequests,savedFilesUnchanged,gitCommits:commits,description:c.description});
}
