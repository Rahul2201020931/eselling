import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['text', 'offer'], default: 'text' },
    text: { type: String, trim: true, maxlength: 1000, default: '' },
    offerAmount: { type: Number, min: 0 },
    // true when the text looks like a common scam phrase; the client shows a safety warning.
    flagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
