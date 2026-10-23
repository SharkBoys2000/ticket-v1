import {authorize} from './auth.js';
export function authorizeWrite(request){
 const denied=authorize(request);if(denied)return denied;
 if(!process.env.APP_ORIGIN||request.headers.get('origin')!==process.env.APP_ORIGIN)return Response.json({error:'Invalid origin'},{status:403});
 return null;
}
