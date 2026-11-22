import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['saved-search', 'review', 'moderation', 'system'], required: true },
    title: { type: String, required: true, maxlength: 150 },
    body: { type: String, maxlength: 300 },
    link: String, // page inside the site, e.g. /listings/123
    readAt: Date,
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
// Old notifications delete themselves after 60 days.
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 24 * 60 * 60 });

export const Notification = mongoose.model('Notification', notificationSchema);

export function notify(userId, { type, title, body, link }) {
  return Notification.create({ user: userId, type, title, body, link }).catch((e) => console.error('notify failed', e.message));
}
