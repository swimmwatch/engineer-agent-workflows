import { join } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
export async function connect(source,project,record=()=>{}) {
 const transport=new StdioClientTransport({command:process.execPath,args:[join(source,"packages/engineer-agent-workflow-mcp/dist/main.js")],env:{PATH:process.env.PATH,HOME:join(project,".mcp-home"),EAW_PRODUCT_DATA_DIR:join(project,".product-store")},stderr:"pipe"});
 const client=new Client({name:"technical-agreement-observer",version:"1"});await client.connect(transport);transport.stderr?.resume();let context;
 return {client,async call(name,args={}){const raw=await client.callTool({name,arguments:{...(["specification_open","workflow_runtime_info"].includes(name)?{}:{context}),...args}});const result=raw.structuredContent??JSON.parse(raw.content.find(x=>x.type==="text").text);record({name,args,result});if(raw.isError||result.error)throw Error(`${name}: ${JSON.stringify(result.error??result)}`);context=result.context??context;return result.result??result;},get context(){return context;}};
}
export async function reviewFrozen(mcp){
 const review=await mcp.call("specification_review_start");let index=0;
 while(index!==null){let cursor,item,text="";do{item=await mcp.call("specification_review_get",{review_ref:review.review_ref,item_index:index,...(cursor?{cursor}:{})});text+=item.text;cursor=item.next_cursor;}while(cursor);const input=JSON.parse(text);await mcp.call("specification_review_record",{review_ref:review.review_ref,item_index:index,read_receipt:item.read_receipt,verdict:"covered",explanation:"Frozen SIMULATION fixture with exact approved behavior and scope.",evidence_requirement_ids:input.kind==="source"?(input.source.requirement_ids??[]):[],evidence_source_refs:input.kind==="requirement"?input.source_refs:[]});index=item.next_item_index;}
 await mcp.call("specification_review_complete",{review_ref:review.review_ref});return mcp.call("specification_check_state");
}

