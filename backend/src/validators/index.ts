import{body,validationResult}from'express-validator';
import{Request,Response,NextFunction}from'express';
export function validate(req:Request,res:Response,next:NextFunction):void{
  const errors=validationResult(req);
  if(!errors.isEmpty()){res.status(422).json({errors:errors.array().map(e=>({field:(e as{path?:string}).path??'unknown',message:e.msg}))});return;}
  next();
}
export const registerRules=[body('email').trim().notEmpty().isEmail(),body('username').trim().isLength({min:3,max:30}).matches(/^[a-zA-Z0-9_-]+$/),body('password').isLength({min:8}).matches(/[A-Z]/).matches(/[0-9]/),body('department').optional().trim().isLength({max:60})];
export const loginRules=[body('email').trim().notEmpty().isEmail(),body('password').notEmpty()];
export const scenarioResultRules=[body('scenarioId').isInt({min:0,max:299}),body('category').isIn(['phishing','vishing','smishing','pretexting','baiting','physical','deepfake']),body('difficulty').isIn(['easy','medium','hard']),body('passed').isBoolean(),body('chosen').isInt({min:0,max:3}),body('timeTaken').optional().isInt({min:0})];
export const quizResultRules=[body('score').isInt({min:0}),body('total').isInt({min:1}),body('answers').isArray({min:1})];
export const moduleProgressRules=[body('moduleId').trim().notEmpty().isLength({max:50})];
export const updateProfileRules=[body('department').optional().trim().isLength({max:60}),body('newPassword').optional().isLength({min:8}).matches(/[A-Z]/).matches(/[0-9]/),body('currentPassword').if(body('newPassword').exists()).notEmpty()];
export const createTemplateRules=[body('name').trim().isLength({min:3,max:100}),body('category').isIn(['phishing','vishing','smishing','pretexting','baiting','physical','deepfake']),body('difficulty').isIn(['easy','medium','hard']),body('subject').trim().notEmpty(),body('senderName').trim().notEmpty(),body('senderEmail').isEmail(),body('htmlBody').trim().notEmpty(),body('redFlags').isArray({min:1})];
export const createCampaignRules=[body('name').trim().isLength({min:3,max:100}),body('templateId').trim().notEmpty(),body('targetDepartment').optional().trim(),body('targetUserIds').optional().isArray(),body('scheduledAt').optional().isISO8601()];
export const trackReportRules=[body('token').trim().isLength({min:10})];
export const coachMessageRules=[body('message').trim().isLength({min:1,max:2000})];
