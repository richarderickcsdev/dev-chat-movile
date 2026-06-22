import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  content: string;
  tempId: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'image';
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 5000 },
    tempId: { type: String, required: true },
    status: {
      type: String,
      enum: ['sending', 'sent', 'delivered', 'read'],
      default: 'sent',
    },
    type: { type: String, enum: ['text', 'image'], default: 'text' },
    imageUrl: { type: String },
    imageWidth: { type: Number },
    imageHeight: { type: Number },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ conversationId: 1, senderId: 1, status: 1 });
messageSchema.index({ senderId: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
