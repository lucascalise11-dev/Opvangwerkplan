import {issueToken,verifyToken} from './intake-token.mjs';
const scope=task=>'review:'+task.id+':'+task.jobId+':'+task.version+':'+task.kind;
export const issueReviewToken=task=>issueToken(scope(task));
export const verifyReviewToken=(task,token)=>verifyToken(scope(task),token);
