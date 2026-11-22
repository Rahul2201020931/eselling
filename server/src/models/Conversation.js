import mongoose from 'mongoose';

const { ObjectId } = mongoose.Schema.Types;

// One chat per buyer per listing.
const conversationSchema = new mongoose.Schema(
  {
    listing: { type: ObjectId, ref: 'Listing', required: true },
    buyer: { type: ObjectId, ref: 'User', required: true },
    seller: { type: ObjectId, ref: 'User', required: true },
    lastMessage: {
      text: String,
      sender: { type: ObjectId, ref: 'User' },
      at: Date,
    },
    // How many messages each side has not read yet.
    unreadBuyer: { type: Number, default: 0 },
    unreadSeller: { type: Number, default: 0 },
  },
  { timestamps: true }
);

conversationSchema.index({ listing: 1, buyer: 1 }, { unique: true });
conversationSchema.index({ buyer: 1, updatedAt: -1 });
conversationSchema.index({ seller: 1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
