import { Schema, model } from 'mongoose';
// Question 22: Social Media Intro
// Users own profiles/privacy, sessions authenticate users, and follows associate users.
// Question 4: Enum
export var Visibility;
(function (Visibility) {
    Visibility["PUBLIC"] = "PUBLIC";
    Visibility["PRIVATE"] = "PRIVATE";
})(Visibility || (Visibility = {}));
export var FollowStatus;
(function (FollowStatus) {
    FollowStatus["PENDING"] = "PENDING";
    FollowStatus["ACCEPTED"] = "ACCEPTED";
})(FollowStatus || (FollowStatus = {}));
const userSchema = new Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, select: false },
    googleSubject: { type: String, unique: true, sparse: true, select: false },
    verified: { type: Boolean, default: false },
    displayName: { type: String, default: '' }, bio: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    visibility: { type: String, enum: Object.values(Visibility), default: Visibility.PUBLIC },
    authVersion: { type: Number, default: 0, select: false },
}, { timestamps: true });
userSchema.index({ displayName: 1 });
export const User = model('User', userSchema);
// Question 11: Implement Association
const sessionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    previousHashes: { type: [String], default: [], select: false },
    expiresAt: { type: Date, required: true }, revoked: { type: Boolean, default: false },
}, { timestamps: true });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Session = model('Session', sessionSchema);
const credentialSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: { type: String, enum: ['verify', 'reset'], required: true },
    tokenHash: { type: String, required: true, unique: true },
    authVersion: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
});
credentialSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const Credential = model('Credential', credentialSchema);
const followSchema = new Schema({
    follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    following: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: Object.values(FollowStatus), required: true },
}, { timestamps: true });
followSchema.index({ follower: 1, following: 1 }, { unique: true });
followSchema.index({ following: 1, status: 1 });
export const Follow = model('Follow', followSchema);
//# sourceMappingURL=index.js.map