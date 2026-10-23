import mongoose from 'mongoose';
const { Schema } = mongoose;
const customerSchema = new Schema({
  lineUserId: { type: String, required: true, unique: true },
  displayName: { type: String, default: null },
  pictureUrl: { type: String, default: null },
  firstSeenAt: { type: Date, required: true },
  lastSeenAt: { type: Date, required: true },
}, { timestamps: true });
const ticketSchema = new Schema({
  webhookEventId: { type: String, required: true, unique: true },
  customer: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
  lineUserId: { type: String, default: null },
  sourceType: { type: String, enum: ['user', 'group', 'room'], required: true },
  groupId: String, roomId: String,
  messageId: { type: String, required: true },
  messageType: { type: String, required: true },
  text: { type: String, default: '' },
  image: {
    provider: { type: String, enum: ['line', 'external'] },
    originalContentUrl: String, previewImageUrl: String,
  },
  eventAt: { type: Date, required: true },
  status: { type: String, enum: ['Pending', 'InProgress', 'Resolved'], default: 'Pending' },
}, { timestamps: true });
ticketSchema.index({ eventAt: -1, _id: -1 });
export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);


// Add the field to an existing development model as well (Fast Refresh).
ticketSchema.add({ notification: {
  type: new Schema({
    key: String, to: String, text: String,
    status: { type: String, enum: ['Pending', 'InProgress', 'Resolved'] },
    note: String, state: { type: String, enum: ['pending', 'failed', 'accepted'] },
    createdAt: Date, acceptedAt: Date, error: String,
  }, { _id: false }), default: undefined,
} });
ticketSchema.add({
  assignee: {type:String,default:''},
  conversationKey: String,
  mergedInto: {type: Schema.Types.ObjectId, ref:'Ticket', default:null},
  mergedAt: Date,
  messageCount: {type:Number,default:1},
  lastMessageAt: Date,
});
const messageSchema=new Schema({
  _id:String, ticket:{type:Schema.Types.ObjectId,ref:'Ticket',required:true},
  originalTicket:{type:Schema.Types.ObjectId,ref:'Ticket'},
  conversationKey:{type:String,required:true}, webhookEventId:String,
  messageId:String,messageType:String,text:String,
  lineUserId:String,sourceType:String,groupId:String,roomId:String,
  eventAt:{type:Date,required:true},image:{provider:String,originalContentUrl:String,previewImageUrl:String},
  duplicateOf:{type:String,default:null},isNewIssueCommand:{type:Boolean,default:false},
},{timestamps:true});
messageSchema.index({ticket:1,eventAt:1,_id:1});
messageSchema.index({conversationKey:1,eventAt:-1});
const conversationSchema=new Schema({
  _id:String,activeTicket:{type:Schema.Types.ObjectId,ref:'Ticket'},
  lastEventAt:Date,lockOwner:String,lockUntil:{type:Date,default:()=>new Date(0)},
});
export const Message=mongoose.models.Message||mongoose.model('Message',messageSchema);
export const Conversation=mongoose.models.Conversation||mongoose.model('Conversation',conversationSchema);

ticketSchema.index({conversationKey:1,eventAt:-1});
if(mongoose.models.Ticket) mongoose.deleteModel('Ticket');
export const Ticket=mongoose.model('Ticket',ticketSchema);
