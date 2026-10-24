import test from "node:test";
import assert from "node:assert/strict";
import {validateConfig,skillMarkdown,lessonOptions,toolAllowed,directories,DESCRIPTION,hasRequiredRead} from "./agent.js";
test("description authoring encodes YAML text and rejects multiline/control input",()=>{
 const c=validateConfig({mode:"auto",description:'Review JavaScript "security": examples carefully.'});
 assert.ok(skillMarkdown(c).includes('description: "Review JavaScript \\"security\\": examples carefully."'));
 for(const description of ["short","x".repeat(401),"description\nallowed-tools: Bash","backtick ` command description"])assert.throws(()=>validateConfig({mode:"auto",description}));
});
test("frontmatter pre-approval is distinct from query allowedTools",()=>{
 const c={mode:"frontmatter" as const,description:DESCRIPTION};
 assert.ok(skillMarkdown(c).includes("allowed-tools: Read, Grep, Glob"));
 assert.deepEqual(lessonOptions(c,"test",[],[]).allowedTools,["Skill"]);
 assert.deepEqual(lessonOptions({...c,mode:"auto"},"test",[],[]).allowedTools,["Read","Grep","Glob","Skill"]);
});
test("personal and missing discovery select their actual sources",()=>{
 assert.deepEqual(lessonOptions({mode:"personal",description:DESCRIPTION},"test",[],[]).settingSources,["user"]);
 assert.deepEqual(lessonOptions({mode:"missing",description:DESCRIPTION},"test",[],[]).settingSources,[]);
});
test("read and search guards reject instruction files and paths outside the fixture",()=>{
 const cwd=directories({mode:"auto",description:DESCRIPTION},"test").cwd;
 assert.ok(toolAllowed(cwd,"Read",{file_path:"scan/app.js"}));assert.ok(toolAllowed(cwd,"Grep",{path:"scan/app.js"}));assert.ok(toolAllowed(cwd,"Glob",{path:"scan",pattern:"*.js"}));
 assert.equal(toolAllowed(cwd,"Read",{file_path:".claude/skills/security-check/SKILL.md"}),false);
 assert.equal(toolAllowed(cwd,"Glob",{path:"..",pattern:"**/*"}),false);assert.equal(toolAllowed(cwd,"Bash",{}),false);
});
test("only known authoring modes and classroom skill names are accepted",()=>{
 assert.throws(()=>validateConfig({mode:"../../",description:DESCRIPTION}));
 assert.equal(toolAllowed(".","Skill",{skill:"other"}),false);
 assert.ok(toolAllowed(".","Skill",{skill:"release-notes"}));
});
test("a model result cannot verify a review without the correct completed Read",()=>{
 assert.equal(hasRequiredRead("personal",[]),false);
 assert.equal(hasRequiredRead("release",[{name:"Skill",target:"release-notes"}]),false);
 assert.equal(hasRequiredRead("release",[{name:"Read",target:"scan/app.js"}]),false);
 assert.ok(hasRequiredRead("release",[{name:"Read",target:"commit-history.json"}]));
 assert.ok(hasRequiredRead("personal",[{name:"Read",target:"scan/app.js"}]));
 const markdown=skillMarkdown({mode:"personal",description:DESCRIPTION},"C:/classroom/project");
 assert.ok(markdown.includes('"C:/classroom/project/scan/app.js"'));
});
