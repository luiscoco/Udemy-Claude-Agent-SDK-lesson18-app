# Claude Agent SDK · Lesson 18 · Authoring your own skills

Based on Lesson18_Authoring_Your_Own_Skills.pptx. Five linked web pages, large text, formatted answers and 13 source-linked UML steps.

## What you will learn

- Choose a discovery level: Author a project skill under .claude/skills/security-check/SKILL.md or a personal skill in the private user skills directory. The corresponding setting source controls discovery.
- Write frontmatter and a workflow body: The app writes a real name, an editable single-line description, optional allowed-tools and trusted Markdown instructions. A specific description tells the model when the workflow is relevant.
- Compare direct and model invocation: Direct /security-check dispatch loads the skill by name. A natural security-review request lets the model choose the matching Skill workflow. Both paths are observed with actual SDK results.
- Pre-approve without confusing it with restriction: Compare allowedTools in query options with allowed-tools in SKILL.md. These pre-approve calls; explicit tools and the host target guard enforce the classroom access boundary.
- Build release-notes from real history: The release exercise creates an owned classroom Git repository with two commits, exports actual git log, and lets /release-notes summarize that JSON. The model does not execute Git or inspect your working repositories.
- Iterate on the description: Edit the description or select the tuned version, start a fresh session, and inspect the generated SKILL.md and completed calls. One successful invocation is an observation, not a statistical guarantee of trigger quality.

## Configure and run

```powershell
git clone https://github.com/luiscoco/Udemy-Claude-Agent-SDK-lesson18-app.git
cd .\Udemy-Claude-Agent-SDK-lesson18-app
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
npm start
```

From presentations, use `cd .\agent-sdk\lesson18-authoring-skills` instead of cloning. Open http://127.0.0.1:3118 and keep the terminal running. Node.js 24+ and model access are required.

## Create your .env file

Preserve an existing file or copy .env.example. Enter your key locally; do not commit it. Restart after edits. Shell values take precedence over the optional file loaded by npm start.

```dotenv
ANTHROPIC_API_KEY=your_api_key
CLAUDE_MODEL=claude-sonnet-4-6
PORT=3118
# Windows if needed: CLAUDE_CODE_GIT_BASH_PATH=C:/Program Files/Git/bin/bash.exe
```

On Windows, set the Git Bash path if needed. Keep optional npm dependencies enabled. A second start recognizes this app; change PORT if another service occupies it.

## Run the experiments

1. Compare model invocation and pre-approval: Run Natural request, then Pre-approve in SKILL.md. Confirm actual file reads and no host fallback approval requests. allowedTools pre-approves; it does not restrict by itself.
2. Compare personal discovery and missing sources: Run Personal with user as its source. Then run Missing source: files still exist, but classroom discovery is disabled and a plain review is requested.
3. Create release notes and tune descriptions: Run /release-notes against the exported actual classroom commits. Then select Tune, edit the description and inspect invocation in a fresh session. Keep the result as observed behavior rather than a guaranteed trigger rate.

```powershell
npm run sample:env -- dispatch
npm run sample:env -- auto
npm run sample:env -- frontmatter
npm run sample:env -- release
npm test
```

`sample` uses only the launching shell environment; `sample:env` loads the optional file. All queries are real and read-only. Prompt and context are fixed classroom choices, not arbitrary browser-supplied source paths.

## How the app was built

### 1. Validate the editable description

Accept only a listed authoring mode and a bounded single-line description. The browser cannot provide executable skill frontmatter or arbitrary filesystem paths.

Source: `src/agent.ts`, lines 134–134. Selected excerpt.

```typescript
c=validateConfig(c);const id=randomUUID(),{files,commits}=await prepareWorkspace(c,id);
```

### 2. Build YAML frontmatter and Markdown

The trusted template supplies the skill name, an encoded student description, optional allowed-tools and the read-only workflow body.

Source: `src/agent.ts`, lines 32–33. Selected excerpt.

```typescript
const approvals=c.mode==="frontmatter" ? "allowed-tools: Read, Grep, Glob\n" : "";
 const target=cwd ? resolve(cwd,"scan/app.js").replaceAll("\\","/") : "scan/app.js";
```

### 3. Choose project or personal location

Write real SKILL.md files in the owned project skills directory or the private user skills directory. Those locations correspond to selected setting sources.

Source: `src/agent.ts`, lines 62–62. Selected excerpt.

```typescript
const d=directories(c,id),base=c.mode==="personal" ? resolve(d.sdkHome,"skills") : resolve(d.cwd,".claude/skills");
```

### 4. Save the authored skill files

Save actual filesystem artifacts before query. The host viewer shows their contents without copying them into the task prompt.

Source: `src/agent.ts`, lines 69–69. Selected excerpt.

```typescript
for(const file of files)await writeFile(file.path,file.contents);
```

### 5. Export actual classroom Git history

The release exercise creates two commits in an owned repository and exports their actual short hashes and subjects. The model reads that export without running Git.

Source: `src/agent.ts`, lines 58–59. Selected excerpt.

```typescript
const {stdout}=await git("log","-2","--format=%h%x09%s");
 return stdout.trim().split("\n").map(line=>{const [hash,subject]=line.trim().split("\t");return {hash,subject};});
```

### 6. Select the matching discovery source

Project and user modes load their authored skills. The missing-source case uses [] while the files remain present.

Source: `src/agent.ts`, lines 98–98. Selected excerpt.

```typescript
settingSources:c.mode==="missing" ? [] : c.mode==="personal" ? ["user"] : ["project"],skills:"all",
```

### 7. Pre-approve through code or frontmatter

Session mode pre-approves Read, Grep, Glob and Skill. Frontmatter mode leaves only Skill in query allowedTools and pre-approves the file tools in SKILL.md.

Source: `src/agent.ts`, lines 100–100. Selected excerpt.

```typescript
allowedTools:c.mode==="frontmatter" ? ["Skill"] : ["Read","Grep","Glob","Skill"],
```

### 8. Enforce the host tool boundary

Explicit tools and exact-target checks enforce access independently of pre-approval. Only the authored sample and commit export can be read.

Source: `src/agent.ts`, lines 87–87. Selected excerpt.

```typescript
if(name==="Read" && typeof input.file_path==="string")return ["scan/app.js","commit-history.json"].some(file=>resolve(cwd,input.file_path as string).toLowerCase()===resolve(cwd,file).toLowerCase());
```

### 9. Choose slash dispatch or a natural request

Direct /security-check and /release-notes dispatch are separate from model invocation on a matching natural security-review request.

Source: `src/agent.ts`, lines 140–140. Selected excerpt.

```typescript
const prompt=c.mode==="release" ? PROMPTS.release : c.mode==="missing" ? PROMPTS.plain : ["auto","tuned"].includes(c.mode) ? PROMPTS.auto : PROMPTS.dispatch;
```

### 10. Start the real SDK query

The SDK discovers authored skills and loads the selected workflow. Its native message and tool loop produce the actual report.

Source: `src/agent.ts`, lines 142–142. Selected excerpt.

```typescript
const run=query({prompt,options});
```

### 11. Record completed tools independently

A successful PostToolUse hook records the actual file or skill target. The fallback callback separately records any unapproved tool request.

Source: `src/agent.ts`, lines 115–115. Selected excerpt.

```typescript
completedTools.push({name:input.tool_name,target});
```

### 12. Verify the required data Read

A successful SDK result alone is not enough. The host requires a completed Read of the correct sample or commit export; otherwise findings are labelled unverified. Original SDK status and text are retained.

Source: `src/agent.ts`, lines 130–131. Selected excerpt.

```typescript
const required=mode==="release" ? "commit-history.json" : "scan/app.js";
 return tools.some(t=>t.name==="Read" && t.target===required);
```

### 13. Render findings as readable content

Parse and sanitize real assistant Markdown. Keep findings, discovery, successful tools, approvals and Git evidence separate.

Source: `src/client.ts`, lines 19–19. Selected excerpt.

```typescript
if (e.type === "answer") renderMarkdown($("answer"), e.text);
```

## Reference topics and limits

- Authoring surface: Students edit the description, while trusted templates fix the name, workflow and supported frontmatter. This teaches authoring without introducing arbitrary command hooks or dynamic shell substitutions. Full raw skill editing is outside this app.
- Project and personal levels: Project skills can be committed and shared. Personal skills apply across projects through the user configuration area. This lab uses a private user directory so it does not alter your existing personal skills.
- Approval is not restriction: allowedTools and skill allowed-tools pre-approve tools. They do not themselves constrain all tool use. The host also supplies an explicit tool list, disallowed tools and target checks. No shell, file edits or external web tool is exposed to the model.
- Description tuning: A specific description names the task and trigger terms. This lab records one fresh model invocation after tuning, not an evaluation dataset or a statistical proof of improved selection.
- Release-notes evidence: The host runs fixed Git commands only in a newly created private classroom repository, with per-command identity settings. The skill reads an export from actual git log; it does not inspect the course repository or run a model Bash command.
- Older commands and collisions: A flat .claude/commands/name.md file is an older command form; skills are the recommended successor. A command-file name can shadow bundled commands/skills. These compatibility and collision cases are reference material, not executed experiments here.

The app never exposes the expanded internal prompt or inherited environment. Marker flags describe actual text, not complete instruction audits. Runtime skill files and private session context remain local. Private classroom directories are not an OS sandbox. Media, .env, dependencies and runtime files are excluded from Git.

## References

- [Authoring your own skills](https://code.claude.com/docs/en/agent-sdk/skills)
- [Authoring skill files](https://code.claude.com/docs/en/skills)
- [TypeScript SDK reference](https://code.claude.com/docs/en/agent-sdk/typescript)

Regenerate student pages with `python scripts/build-pages.py`.
