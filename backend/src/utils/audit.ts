// audit.ts
import{v4 as uuidv4}from'uuid';
import{dbRun}from'../database';
export function audit(userId:string|null,action:string,detail:Record<string,unknown>|null=null,ip:string|null=null):void{
  try{dbRun('INSERT INTO audit_log(id,user_id,action,detail,ip)VALUES(?,?,?,?,?)',[uuidv4(),userId,action,detail?JSON.stringify(detail):null,ip]);}
  catch(e){console.error('[Audit]',(e as Error).message);}
}
