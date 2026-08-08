import{Request,Response,NextFunction}from'express';
import{config}from'../config';
export interface AppError extends Error{status?:number;expose?:boolean;}
export function errorHandler(err:AppError,req:Request,res:Response,_next:NextFunction):void{
  const status=err.status??500;
  const message=err.expose||status<500?err.message:'Internal server error';
  if(status>=500)console.error(`[ERROR] ${req.method} ${req.path}`,err);
  res.status(status).json({error:message,...(config.isDev&&status>=500?{stack:err.stack}:{})});
}
export function notFound(req:Request,res:Response):void{
  res.status(404).json({error:`Route ${req.method} ${req.path} not found`});
}
