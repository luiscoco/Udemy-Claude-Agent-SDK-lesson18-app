import {runAgent,validateConfig,DESCRIPTION,TUNED_DESCRIPTION} from "./agent.js";
const mode=process.argv[2] || "dispatch";
await runAgent(validateConfig({mode,description:mode==="tuned" ? TUNED_DESCRIPTION : DESCRIPTION}),e=>{
 if(e.type==="answer")console.log(e.text);
 else if(e.type!=="message")console.log(JSON.stringify(e));
});
