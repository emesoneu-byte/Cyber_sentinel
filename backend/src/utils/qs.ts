import type{ParsedQs}from'qs';
type QV=string|ParsedQs|(string|ParsedQs)[]|undefined;
export function qs(val:QV):string|undefined{if(val===undefined||val===null)return undefined;if(typeof val==='string')return val;if(Array.isArray(val))return val.length>0?qs(val[0] as QV):undefined;return undefined;}
export function qsInt(val:QV,fb:number):number{const s=qs(val);if(s===undefined)return fb;const n=parseInt(s,10);return isNaN(n)?fb:n;}
export function param(val:string|string[]|undefined):string{if(!val)return'';return Array.isArray(val)?(val[0]??''):val;}
