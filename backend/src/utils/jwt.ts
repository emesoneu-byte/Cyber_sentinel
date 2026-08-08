import jwt from'jsonwebtoken';
import crypto from'crypto';
import{v4 as uuidv4}from'uuid';
import{config}from'../config';
import{dbRun,dbGet,dbAll}from'../database';
import type{JwtPayload,SafeUser,RefreshToken}from'../types';
export function issueAccessToken(user:SafeUser):string{
  const p:Omit<JwtPayload,'iat'|'exp'>={sub:user.id,email:user.email,role:user.role,username:user.username};
  return jwt.sign(p,config.jwt.secret,{expiresIn:config.jwt.expiresIn as jwt.SignOptions['expiresIn']});
}
export function issueRefreshToken(userId:string):string{
  const raw=crypto.randomBytes(64).toString('hex');
  const hash=crypto.createHash('sha256').update(raw).digest('hex');
  const expiresAt=new Date(Date.now()+7*24*60*60*1000).toISOString();
  const existing=dbAll<RefreshToken>('SELECT id FROM refresh_tokens WHERE user_id=? ORDER BY created_at ASC',[userId]);
  if(existing.length>=5)dbRun('DELETE FROM refresh_tokens WHERE id=?',[existing[0].id]);
  dbRun('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at)VALUES(?,?,?,?)',[uuidv4(),userId,hash,expiresAt]);
  return raw;
}
export function verifyAccessToken(token:string):JwtPayload{return jwt.verify(token,config.jwt.secret)as JwtPayload;}
export function verifyRefreshToken(raw:string,userId:string):RefreshToken|null{
  const hash=crypto.createHash('sha256').update(raw).digest('hex');
  const stored=dbGet<RefreshToken>('SELECT * FROM refresh_tokens WHERE user_id=? AND token_hash=?',[userId,hash]);
  if(!stored)return null;
  if(new Date(stored.expires_at)<new Date()){dbRun('DELETE FROM refresh_tokens WHERE id=?',[stored.id]);return null;}
  return stored;
}
export function revokeRefreshToken(raw:string,userId:string):void{const hash=crypto.createHash('sha256').update(raw).digest('hex');dbRun('DELETE FROM refresh_tokens WHERE user_id=? AND token_hash=?',[userId,hash]);}
export function revokeAllUserTokens(userId:string):void{dbRun('DELETE FROM refresh_tokens WHERE user_id=?',[userId]);}
