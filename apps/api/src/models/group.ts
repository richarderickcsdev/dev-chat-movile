import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  members: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, maxlength: 100 },
    members: { type: [String], required: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);

groupSchema.index({ members: 1 });

export const Group = mongoose.model<IGroup>('Group', groupSchema);
