import{Request,Response,NextFunction}from'express';
import jwt from'jsonwebtoken';
import{config}from'../config';
import{dbGet}from'../database';
import type{JwtPayload,Role}from'../types';
export function authenticate(req:Request,res:Response,next:NextFunction):void{
  const h=req.headers.authorization;
  if(!h?.startsWith('Bearer ')){res.status(401).json({error:'Authentication required'});return;}
  try{
    const payload=jwt.verify(h.slice(7),config.jwt.secret)as JwtPayload;
    const user=dbGet<{id:string;is_active:number}>('SELECT id,is_active FROM users WHERE id=?',[payload.sub]);
    if(!user||!user.is_active){res.status(401).json({error:'Account not found or deactivated'});return;}
    req.user=payload;next();
  }catch(err:unknown){
    if((err as Error&{name?:string}).name==='TokenExpiredError'){res.status(401).json({error:'Token expired',code:'TOKEN_EXPIRED'});return;}
    res.status(401).json({error:'Invalid token'});
  }
}
export function requireRole(...roles:Role[]){
  return(req:Request,res:Response,next:NextFunction):void=>{
    if(!roles.includes(req.user?.role)){res.status(403).json({error:'Insufficient permissions'});return;}
    next();
  };
}
