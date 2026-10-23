import {connectDB} from './db.js';
import {Ticket} from './models.js';
import {reportPeriod,reportBuckets} from './report-period.js';
export async function ticketReport(mode,year,month){
 const {start,end,ranges}=reportPeriod(mode,year,month);await connectDB();
 const [result]=await Ticket.aggregate([
 {$match:{mergedInto:null,eventAt:{$gte:start,$lt:end}}},
 {$facet:{
 buckets:[{$group:{_id:{$dateToString:{date:'$eventAt',format:mode!=='monthly'?'%Y-%m-%d':'%Y-%m',timezone:'Asia/Bangkok'}},tickets:{$sum:1},people:{$addToSet:'$lineUserId'}}}],
 summary:[{$group:{_id:null,total:{$sum:1},people:{$addToSet:'$lineUserId'},pending:{$sum:{$cond:[{$eq:['$status','Pending']},1,0]}},inProgress:{$sum:{$cond:[{$eq:['$status','InProgress']},1,0]}},resolved:{$sum:{$cond:[{$eq:['$status','Resolved']},1,0]}}}}]
 }}]).option({maxTimeMS:8000});
 const summary=result.summary[0]||{total:0,people:[],pending:0,inProgress:0,resolved:0};
 const people=a=>a.filter(Boolean).length;
 return {mode,year,month,total:summary.total,people:people(summary.people),pending:summary.pending,inProgress:summary.inProgress,resolved:summary.resolved,
 buckets:reportBuckets(ranges,result.buckets)};
}
