import mongoose from 'mongoose';
const schema=new mongoose.Schema({title:{type:String,required:true},category:{type:String,default:''},symptom:{type:String,required:true},steps:{type:String,required:true},verification:{type:String,default:''},images:{type:[new mongoose.Schema({id:String,name:String,caption:String,data:Buffer,mime:String},{_id:false})],default:[]},revision:{type:Number,default:1}},{timestamps:true});
if(mongoose.models.Guide&&!mongoose.models.Guide.schema.path('images'))mongoose.deleteModel('Guide');
export const Guide=mongoose.models.Guide||mongoose.model('Guide',schema);
export function guideInput(b){
 const out={};for(const [key,max] of [['title',150],['category',80],['symptom',4000],['steps',20000],['verification',4000]]){
 if(typeof b?.[key]!=='string'||b[key].length>max)throw new Error('กรุณากรอกข้อมูลให้ครบและไม่เกินความยาวที่กำหนด');out[key]=b[key].trim();}
 if(!out.title||!out.symptom||!out.steps)throw new Error('กรุณากรอกชื่อเรื่อง อาการ และขั้นตอนแก้ไข');return out;
}
