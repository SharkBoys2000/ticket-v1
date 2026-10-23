import {authorize,sameOrigin} from './auth.js';
export function authorizeWrite(request){
 const denied=authorize(request);if(denied)return denied;
 if(!sameOrigin(request))return Response.json({error:'Invalid origin'},{status:403});
 return null;
}
