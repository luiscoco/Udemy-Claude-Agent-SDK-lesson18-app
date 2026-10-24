export type Mode="dispatch"|"auto"|"frontmatter"|"personal"|"missing"|"release"|"tuned";
export type RunConfig={mode:Mode;description:string};
export type LabEvent=
 | {type:"fixtures";files:{name:string;contents:string}[]}
 | {type:"options";config:RunConfig;options:Record<string,unknown>}
 | {type:"initialized";model:string;sessionId:string;skills:string[];slashCommands:string[]}
 | {type:"message";sdkType:string;summary:string}
 | {type:"tool";name:string;target:string}
 | {type:"permission";name:string}
 | {type:"answer";text:string}
 | {type:"result";status:string;sdkStatus:string;text:string;sessionId:string;costUsd:number}
 | {type:"evidence";mode:Mode;initSkills:string[];completedTools:{name:string;target:string}[];returnedMarkers:string[];permissionRequests:string[];savedFilesUnchanged:boolean;gitCommits:{hash:string;subject:string}[];description:string}
 | {type:"notice"|"error";text:string};
