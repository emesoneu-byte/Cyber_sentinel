import{Request,Response,NextFunction}from'express';
import bcrypt from'bcryptjs';
import{v4 as uuidv4}from'uuid';
import{dbRun,dbGet}from'../database';
import{issueAccessToken,issueRefreshToken,verifyRefreshToken,revokeRefreshToken}from'../utils/jwt';
import{audit}from'../utils/audit';
import type{User}from'../types';
export async function register(req:Request,res:Response,next:NextFunction):Promise<void>{
  try{
    const{email,username,password,department}=req.body as{email:string;username:string;password:string;department?:string};
    if(dbGet('SELECT id FROM users WHERE email=?',[email])){res.status(409).json({error:'Email already registered'});return;}
    if(dbGet('SELECT id FROM users WHERE username=?',[username])){res.status(409).json({error:'Username already taken'});return;}
    const hash=await bcrypt.hash(password,12);const id=uuidv4();
    dbRun('INSERT INTO users(id,email,username,password,department)VALUES(?,?,?,?,?)',[id,email,username,hash,department??null]);
    const user=dbGet<Omit<User,'password'>>('SELECT id,email,username,role,department,xp,streak,created_at FROM users WHERE id=?',[id])!;
    audit(id,'REGISTER',{email,username},req.ip??null);
    res.status(201).json({user,accessToken:issueAccessToken(user as User),refreshToken:issueRefreshToken(id)});
  }catch(err){next(err);}
}
export async function login(req:Request,res:Response,next:NextFunction):Promise<void>{
  try{
    const rawEmail = String((req.body as{email?:string}).email ?? '').trim();
    const password = String((req.body as{password?:string}).password ?? '');
    const email = rawEmail.toLowerCase();
    // Allow login with username "admin" as a shortcut
    let user = dbGet<User>('SELECT * FROM users WHERE lower(email)=?',[email]);
    if (!user && email === 'admin') {
      user = dbGet<User>("SELECT * FROM users WHERE role='admin' ORDER BY created_at ASC LIMIT 1");
    }
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. Use admin@example.com / Admin123! (or create an account).' });
      return;
    }
    if (!user.is_active) { res.status(403).json({ error: 'Account deactivated' }); return; }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials. Password must match ADMIN_PASSWORD in backend/.env (default Admin123!).' });
      return;
    }
    dbRun(`UPDATE users SET last_active=datetime('now') WHERE id=?`,[user.id]);
    const{password:_p,...safeUser}=user;
    audit(user.id,'LOGIN',null,req.ip??null);
    res.json({user:safeUser,accessToken:issueAccessToken(user),refreshToken:issueRefreshToken(user.id)});
  }catch(err){next(err);}
}
export function refresh(req:Request,res:Response,next:NextFunction):void{
  try{
    const{refreshToken,userId}=req.body as{refreshToken:string;userId:string};
    if(!refreshToken||!userId){res.status(400).json({error:'refreshToken and userId required'});return;}
    const stored=verifyRefreshToken(refreshToken,userId);
    if(!stored){res.status(401).json({error:'Invalid or expired refresh token'});return;}
    const user=dbGet<User>('SELECT * FROM users WHERE id=?',[userId]);
    if(!user||!user.is_active){res.status(401).json({error:'User not found'});return;}
    res.json({accessToken:issueAccessToken(user)});
  }catch(err){next(err);}
}
export function logout(req:Request,res:Response,next:NextFunction):void{
  try{
    const{refreshToken}=req.body as{refreshToken?:string};
    if(refreshToken)revokeRefreshToken(refreshToken,req.user.sub);
    audit(req.user.sub,'LOGOUT',null,req.ip??null);
    res.json({message:'Logged out successfully'});
  }catch(err){next(err);}
}
