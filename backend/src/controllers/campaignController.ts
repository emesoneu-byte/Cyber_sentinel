import{Request,Response,NextFunction}from'express';
import{v4 as uuidv4}from'uuid';
import crypto from'crypto';
import{dbRun,dbGet,dbAll}from'../database';
import{sendSimulationEmail,sendTestEmail,verifyMailer}from'../services/mailer';
import{audit}from'../utils/audit';
import{qs,param}from'../utils/qs';
import type{CreateCampaignBody,CreateTemplateBody,EmailTemplate,Campaign,CampaignRecipient}from'../types';

export function createTemplate(req:Request<object,object,CreateTemplateBody>,res:Response,next:NextFunction):void{
  try{
    const{name,category,difficulty,subject,senderName,senderEmail,htmlBody,landingPageHtml,redFlags}=req.body;
    const id=uuidv4();
    dbRun(`INSERT INTO email_templates(id,name,category,difficulty,subject,sender_name,sender_email,html_body,landing_page_html,red_flags)VALUES(?,?,?,?,?,?,?,?,?,?)`,[id,name,category,difficulty,subject,senderName,senderEmail,htmlBody,landingPageHtml??null,JSON.stringify(redFlags)]);
    audit(req.user.sub,'TEMPLATE_CREATE',{id,name,category},req.ip??null);
    res.status(201).json({template:dbGet<EmailTemplate>('SELECT * FROM email_templates WHERE id=?',[id])});
  }catch(err){next(err);}
}
export function getTemplates(req:Request,res:Response):void{
  const category=qs(req.query['category']);
  let sql='SELECT * FROM email_templates WHERE 1=1';const p:unknown[]=[];
  if(category){sql+=' AND category=?';p.push(category);}sql+=' ORDER BY created_at DESC';
  res.json({templates:dbAll<EmailTemplate>(sql,p).map(t=>({...t,red_flags:JSON.parse(t.red_flags) as string[]}))});
}
export function getTemplate(req:Request,res:Response):void{
  const t=dbGet<EmailTemplate>('SELECT * FROM email_templates WHERE id=?',[param(req.params['id'])]);
  if(!t){res.status(404).json({error:'Template not found'});return;}
  res.json({template:{...t,red_flags:JSON.parse(t.red_flags) as string[]}});
}
export function deleteTemplate(req:Request,res:Response,next:NextFunction):void{
  try{
    const id=param(req.params['id']);
    if(dbGet('SELECT id FROM campaigns WHERE template_id=?',[id])){res.status(409).json({error:'Template is used by a campaign'});return;}
    dbRun('DELETE FROM email_templates WHERE id=?',[id]);
    audit(req.user.sub,'TEMPLATE_DELETE',{id},req.ip??null);
    res.json({message:'Template deleted'});
  }catch(err){next(err);}
}
export function seedDefaultTemplates():void{
  const existing=dbGet<{c:number}>('SELECT COUNT(*)as c FROM email_templates');
  if((existing?.c??0)>0)return;
  const DEFAULTS:CreateTemplateBody[]=[
    {name:'IT Password Reset Urgency',category:'phishing',difficulty:'easy',subject:'URGENT: Your password expires in 2 hours',senderName:'IT Helpdesk',senderEmail:'it-helpdesk@corp0rate-support.net',htmlBody:'<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:560px"><p>Dear Employee,</p><p>Your password will expire in 2 hours. Failure to reset will result in account lockout.</p><p><a href="{{TRACKING_LINK}}" style="background:#c0392b;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block">Reset Password Now</a></p><p>IT Support Team</p></div>',redFlags:['Urgency language','Generic greeting','Spoofed domain','Threat of lockout']},
    {name:'MD Naira Transfer Request',category:'phishing',difficulty:'hard',subject:'Confidential — process NGN transfer before COB',senderName:'Chinedu Okafor (MD)',senderEmail:'md@company.com.transfer-auth.biz',htmlBody:'<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:560px"><p>Good afternoon,</p><p>I am in a board meeting in Lagos and cannot take calls. Please process an urgent transfer of NGN 18,500,000 before 4pm. Treat as strictly confidential.</p><p><a href="{{TRACKING_LINK}}">View transfer details</a></p><p>Regards,<br>Engr. Chinedu Okafor, MD</p></div>',redFlags:['Secrecy demand','Unavailable for verification','Lookalike domain','Urgency','Naira BEC']},
    {name:'GIG Logistics Fee (NG)',category:'phishing',difficulty:'easy',subject:'Your parcel is held at Lagos hub — NGN 2,850 fee',senderName:'GIG Logistics',senderEmail:'noreply@gig-delivery-update.xyz',htmlBody:'<div style="font-family:Arial,sans-serif;font-size:14px;color:#111;max-width:560px"><p>Your parcel is held at the Lagos hub.</p><p>Pay NGN 2,850 delivery/clearance fee to release your package.</p><p><a href="{{TRACKING_LINK}}">Pay now</a></p></div>',redFlags:['.xyz domain','Small Naira fee','No tracking number','Courier brand impersonation']},
  ];
  for(const t of DEFAULTS){
    const id=uuidv4();
    dbRun(`INSERT INTO email_templates(id,name,category,difficulty,subject,sender_name,sender_email,html_body,landing_page_html,red_flags)VALUES(?,?,?,?,?,?,?,?,?,?)`,[id,t.name,t.category,t.difficulty,t.subject,t.senderName,t.senderEmail,t.htmlBody,t.landingPageHtml??null,JSON.stringify(t.redFlags)]);
  }
  console.log('[Seed] 3 default email templates created');
}
export function createCampaign(req:Request<object,object,CreateCampaignBody>,res:Response,next:NextFunction):void{
  try{
    const{name,templateId,targetDepartment,targetUserIds,scheduledAt}=req.body;
    if(!dbGet('SELECT id FROM email_templates WHERE id=?',[templateId])){res.status(404).json({error:'Template not found'});return;}
    const id=uuidv4();
    dbRun('INSERT INTO campaigns(id,name,template_id,created_by,status,scheduled_at,target_department)VALUES(?,?,?,?,?,?,?)',[id,name,templateId,req.user.sub,scheduledAt?'scheduled':'draft',scheduledAt??null,targetDepartment??null]);
    let recipients:Array<{id:string}>;
    if(targetUserIds&&targetUserIds.length>0)recipients=targetUserIds.map(uid=>({id:uid}));
    else if(targetDepartment)recipients=dbAll<{id:string}>('SELECT id FROM users WHERE department=? AND is_active=1',[targetDepartment]);
    else recipients=dbAll<{id:string}>('SELECT id FROM users WHERE is_active=1');
    for(const r of recipients)dbRun('INSERT INTO campaign_recipients(id,campaign_id,user_id,status,tracking_token)VALUES(?,?,?,?,?)',[uuidv4(),id,r.id,'pending',crypto.randomBytes(24).toString('hex')]);
    audit(req.user.sub,'CAMPAIGN_CREATE',{id,name,recipientCount:recipients.length},req.ip??null);
    res.status(201).json({campaign:dbGet<Campaign>('SELECT * FROM campaigns WHERE id=?',[id]),recipientCount:recipients.length});
  }catch(err){next(err);}
}
export function getCampaigns(req:Request,res:Response):void{
  const status=qs(req.query['status']);
  let sql=`SELECT c.*,t.name as template_name,t.category,u.username as creator_name,(SELECT COUNT(*)FROM campaign_recipients cr WHERE cr.campaign_id=c.id)as recipient_count,(SELECT COUNT(*)FROM campaign_recipients cr WHERE cr.campaign_id=c.id AND cr.status='clicked')as clicked_count,(SELECT COUNT(*)FROM campaign_recipients cr WHERE cr.campaign_id=c.id AND cr.status='reported')as reported_count FROM campaigns c JOIN email_templates t ON c.template_id=t.id JOIN users u ON c.created_by=u.id WHERE 1=1`;
  const p:unknown[]=[];
  if(status){sql+=' AND c.status=?';p.push(status);}sql+=' ORDER BY c.created_at DESC';
  res.json({campaigns:dbAll(sql,p)});
}
export function getCampaignDetail(req:Request,res:Response):void{
  const id=param(req.params['id']);
  const campaign=dbGet<Campaign>('SELECT * FROM campaigns WHERE id=?',[id]);
  if(!campaign){res.status(404).json({error:'Campaign not found'});return;}
  const recipients=dbAll<CampaignRecipient&{username:string;email:string;department:string|null}>(`SELECT cr.*,u.username,u.email,u.department FROM campaign_recipients cr JOIN users u ON cr.user_id=u.id WHERE cr.campaign_id=? ORDER BY cr.sent_at DESC`,[id]);
  const stats={total:recipients.length,sent:recipients.filter(r=>['sent','delivered','opened','clicked','reported','submitted_data'].includes(r.status)).length,opened:recipients.filter(r=>['opened','clicked','reported','submitted_data'].includes(r.status)).length,clicked:recipients.filter(r=>['clicked','submitted_data'].includes(r.status)).length,reported:recipients.filter(r=>r.status==='reported').length,failed:recipients.filter(r=>r.status==='failed').length};
  res.json({campaign,template:dbGet<EmailTemplate>('SELECT * FROM email_templates WHERE id=?',[campaign.template_id]),recipients,stats});
}
export async function launchCampaign(req:Request,res:Response,next:NextFunction):Promise<void>{
  try{
    const id=param(req.params['id']);
    const campaign=dbGet<Campaign>('SELECT * FROM campaigns WHERE id=?',[id]);
    if(!campaign){res.status(404).json({error:'Campaign not found'});return;}
    if(campaign.status==='sending'||campaign.status==='completed'){res.status(409).json({error:`Campaign already ${campaign.status}`});return;}
    const template=dbGet<EmailTemplate>('SELECT * FROM email_templates WHERE id=?',[campaign.template_id]);
    if(!template){res.status(404).json({error:'Template not found'});return;}
    dbRun(`UPDATE campaigns SET status='sending',started_at=datetime('now') WHERE id=?`,[id]);
    const recipients=dbAll<CampaignRecipient&{email:string}>(`SELECT cr.*,u.email FROM campaign_recipients cr JOIN users u ON cr.user_id=u.id WHERE cr.campaign_id=? AND cr.status='pending'`,[id]);
    let sentCount=0,failedCount=0;
    const errors:string[]=[];
    for(const r of recipients){
      const result=await sendSimulationEmail({to:r.email,senderName:template.sender_name,senderEmail:template.sender_email,subject:template.subject,htmlBody:template.html_body,trackingToken:r.tracking_token});
      if(result.success){dbRun(`UPDATE campaign_recipients SET status='sent',sent_at=datetime('now') WHERE id=?`,[r.id]);sentCount++;}
      else{dbRun(`UPDATE campaign_recipients SET status='failed' WHERE id=?`,[r.id]);failedCount++;if(errors.length<3&&result.error)errors.push(`${r.email}: ${result.error}`);}
    }
    dbRun(`UPDATE campaigns SET status='completed',completed_at=datetime('now') WHERE id=?`,[id]);
    audit(req.user.sub,'CAMPAIGN_LAUNCH',{id,sentCount,failedCount},req.ip??null);
    if(sentCount===0&&failedCount>0){
      res.status(400).json({error:`All ${failedCount} emails failed. ${errors[0]||'Check SMTP settings in backend/.env'}`,sentCount,failedCount,totalRecipients:recipients.length,errors});
      return;
    }
    res.json({message:failedCount?`Campaign finished with ${failedCount} failure(s)`:'Campaign launched',sentCount,failedCount,totalRecipients:recipients.length,errors});
  }catch(err){next(err);}
}

export function cancelCampaign(req:Request,res:Response,next:NextFunction):void{
  try{
    const id=param(req.params['id']);
    const campaign=dbGet<Campaign>('SELECT status FROM campaigns WHERE id=?',[id]);
    if(!campaign){res.status(404).json({error:'Campaign not found'});return;}
    if(campaign.status==='completed'){res.status(409).json({error:'Cannot cancel a completed campaign'});return;}
    dbRun(`UPDATE campaigns SET status='cancelled' WHERE id=?`,[id]);
    audit(req.user.sub,'CAMPAIGN_CANCEL',{id},req.ip??null);
    res.json({message:'Campaign cancelled'});
  }catch(err){next(err);}
}
export function getCampaignAnalytics(_req:Request,res:Response):void{
  res.json({byDepartment:dbAll(`SELECT u.department,COUNT(*)as total,SUM(CASE WHEN cr.status IN('clicked','submitted_data')THEN 1 ELSE 0 END)as clicked,SUM(CASE WHEN cr.status='reported'THEN 1 ELSE 0 END)as reported FROM campaign_recipients cr JOIN users u ON cr.user_id=u.id WHERE u.department IS NOT NULL GROUP BY u.department`),byCategory:dbAll(`SELECT t.category,COUNT(*)as total,SUM(CASE WHEN cr.status IN('clicked','submitted_data')THEN 1 ELSE 0 END)as clicked,SUM(CASE WHEN cr.status='reported'THEN 1 ELSE 0 END)as reported FROM campaign_recipients cr JOIN campaigns c ON cr.campaign_id=c.id JOIN email_templates t ON c.template_id=t.id GROUP BY t.category`)});
}
export function trackOpen(req:Request,res:Response):void{
  const token=param(req.params['token']);
  const recipient=dbGet<CampaignRecipient>('SELECT * FROM campaign_recipients WHERE tracking_token=?',[token]);
  const pixel=Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==','base64');
  res.set('Content-Type','image/gif');
  if(recipient&&recipient.status==='sent')dbRun(`UPDATE campaign_recipients SET status='opened',opened_at=datetime('now'),ip_address=?,user_agent=? WHERE id=?`,[req.ip??null,req.headers['user-agent']??null,recipient.id]);
  res.send(pixel);
}
export function trackClick(req:Request,res:Response):void{
  const token=param(req.params['token']);
  const recipient=dbGet<CampaignRecipient>('SELECT * FROM campaign_recipients WHERE tracking_token=?',[token]);
  if(recipient&&!['clicked','reported','submitted_data'].includes(recipient.status))dbRun(`UPDATE campaign_recipients SET status='clicked',clicked_at=datetime('now'),ip_address=?,user_agent=? WHERE id=?`,[req.ip??null,req.headers['user-agent']??null,recipient.id]);
  res.redirect(`/training/caught?token=${token}`);
}
export function trackReport(req:Request,res:Response,next:NextFunction):void{
  try{
    const{token}=req.body as{token:string};
    const recipient=dbGet<CampaignRecipient>('SELECT * FROM campaign_recipients WHERE tracking_token=?',[token]);
    if(!recipient){res.status(404).json({error:'Invalid tracking token'});return;}
    dbRun(`UPDATE campaign_recipients SET status='reported',reported_at=datetime('now') WHERE id=?`,[recipient.id]);
    dbRun(`UPDATE users SET xp=xp+15,last_active=datetime('now') WHERE id=?`,[recipient.user_id]);
    audit(recipient.user_id,'CAMPAIGN_REPORTED',{campaignId:recipient.campaign_id},req.ip??null);
    res.json({message:'Thank you for reporting this simulated phishing email!',xpEarned:15});
  }catch(err){next(err);}
}
export function getMyTrainingResult(req:Request,res:Response):void{
  const token=qs(req.query['token']);
  if(!token){res.status(400).json({error:'token required'});return;}
  const recipient=dbGet<CampaignRecipient>('SELECT * FROM campaign_recipients WHERE tracking_token=?',[token]);
  if(!recipient){res.status(404).json({error:'Invalid token'});return;}
  const campaign=dbGet<Campaign&{template_name:string;category:string;red_flags:string}>(`SELECT c.*,t.name as template_name,t.category,t.red_flags FROM campaigns c JOIN email_templates t ON c.template_id=t.id WHERE c.id=?`,[recipient.campaign_id]);
  res.json({campaign:campaign?{...campaign,red_flags:JSON.parse(campaign.red_flags) as string[]}:null,recipientStatus:recipient.status});
}

export async function testSmtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const to = (req.body as { to?: string })?.to || req.user.email;
    const v = await verifyMailer();
    if (!v.ok) { res.status(400).json({ error: `SMTP connection failed: ${v.error}` }); return; }
    const r = await sendTestEmail(to);
    if (!r.success) { res.status(400).json({ error: r.error }); return; }
    res.json({ message: `Test email sent to ${to}` });
  } catch (err) { next(err); }
}
