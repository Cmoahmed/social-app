import { Follow, FollowStatus, User, Visibility } from '../../models/index.js';
import { AppError } from '../../errors/app-error.js';
export const publicCard = (user) => ({ id: user.id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl, visibility: user.visibility });
export async function requireUser(id) {
    const user = await User.findOne({ _id: id, verified: true });
    if (!user)
        throw new AppError(404, 'User not found');
    return user;
}
export async function canView(viewer, user) {
    return viewer === user.id || user.visibility === Visibility.PUBLIC || Boolean(await Follow.exists({ follower: viewer, following: user.id, status: FollowStatus.ACCEPTED }));
}
// Question 40: User Profile Retrieval and Updates
export async function getProfile(viewer, id) {
    const user = await requireUser(id);
    if (!await canView(viewer, user))
        throw new AppError(403, 'This profile is private');
    const [followers, following] = await Promise.all([
        Follow.countDocuments({ following: id, status: FollowStatus.ACCEPTED }),
        Follow.countDocuments({ follower: id, status: FollowStatus.ACCEPTED }),
    ]);
    return { ...publicCard(user), bio: user.bio, followers, following, ...(viewer === id ? { email: user.email } : {}) };
}
export async function updateProfile(id, input) {
    await User.updateOne({ _id: id }, { $set: input }, { runValidators: true });
    return getProfile(id, id);
}
// Question 42: User Search and Suggestions
export async function discover(viewer, options, suggestions) {
    const { page, limit, q } = options;
    const excluded = suggestions ? await Follow.find({ follower: viewer }).distinct('following') : [];
    const literal = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = { verified: true, _id: { $nin: [viewer, ...excluded] },
        ...(suggestions ? {} : { $or: [{ username: { $regex: literal, $options: 'i' } }, { displayName: { $regex: literal, $options: 'i' } }] }) };
    const [users, total] = await Promise.all([User.find(filter).sort({ username: 1, _id: 1 }).skip((page - 1) * limit).limit(limit), User.countDocuments(filter)]);
    return { items: users.map(publicCard), page, limit, total };
}
// Question 43: Account Settings and Privacy Control
export async function setVisibility(id, visibility) {
    await User.updateOne({ _id: id }, { $set: { visibility } });
    // Pending requests remain pending on visibility changes and still require explicit approval.
    return { visibility };
}
//# sourceMappingURL=service.js.map