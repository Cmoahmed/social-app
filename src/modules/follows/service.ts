import { Follow, FollowStatus, Visibility } from '../../models/index.js';
import { AppError } from '../../errors/app-error.js';
import { canView, publicCard, requireUser } from '../users/service.js';
// Question 41: Follow / Unfollow System
export async function follow(viewer: string, target: string) {
  if (viewer === target) throw new AppError(400, 'You cannot follow yourself');
  const user = await requireUser(target);
  const relation = await Follow.create({ follower: viewer, following: target,
    status: user.visibility === Visibility.PRIVATE ? FollowStatus.PENDING : FollowStatus.ACCEPTED });
  // Recheck visibility to avoid approving a follow against a concurrently privatized profile.
  const current = await requireUser(target);
  if (current.visibility === Visibility.PRIVATE && relation.status === FollowStatus.ACCEPTED) {
    relation.status = FollowStatus.PENDING; await relation.save();
  }
  return { id: relation.id, status: relation.status };
}
export async function unfollow(viewer: string, target: string) {
  await Follow.deleteOne({ follower: viewer, following: target });
}
export async function incoming(viewer: string, page: number, limit: number) {
  const filter = { following: viewer, status: FollowStatus.PENDING };
  const [items, total] = await Promise.all([Follow.find(filter).sort({ _id: 1 }).skip((page - 1) * limit).limit(limit)
    .populate<{ follower: { id: string; username: string; displayName: string } }>('follower', 'username displayName'), Follow.countDocuments(filter)]);
  return { items: items.map(v => ({ id: v.id, follower: { id: v.follower.id, username: v.follower.username, displayName: v.follower.displayName } })), total, page, limit };
}
export async function decide(viewer: string, id: string, accept: boolean) {
  const filter = { _id: id, following: viewer, status: FollowStatus.PENDING };
  const relation = accept ? await Follow.findOneAndUpdate(filter, { $set: { status: FollowStatus.ACCEPTED } }) : await Follow.findOneAndDelete(filter);
  if (!relation) throw new AppError(404, 'Pending request not found');
  return { message: accept ? 'Follow request accepted' : 'Follow request rejected' };
}
export async function list(viewer: string, target: string, direction: 'followers' | 'following', page: number, limit: number) {
  const user = await requireUser(target);
  if (!await canView(viewer, user)) throw new AppError(403, 'This profile is private');
  const filter = { [direction === 'followers' ? 'following' : 'follower']: target, status: FollowStatus.ACCEPTED };
  const field = direction === 'followers' ? 'follower' : 'following';
  const relations = await Follow.find(filter).sort({ _id: 1 }).skip((page - 1) * limit).limit(limit);
  const cards = await Promise.all(relations.map(async relation => publicCard(await requireUser(String(relation[field])))));
  return { items: cards, total: await Follow.countDocuments(filter), page, limit };
}
