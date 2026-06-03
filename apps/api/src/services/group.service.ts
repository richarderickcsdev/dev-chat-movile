import { Group, IGroup } from '../models/group';
import { logger } from '../lib/logger';
import { AppError } from '../middlewares/errorHandler';

export async function createGroup(name: string, createdBy: string, memberIds: string[]): Promise<IGroup> {
  const allMembers = [...new Set([createdBy, ...memberIds])];

  const group = await Group.create({
    name,
    members: allMembers,
    createdBy,
  });

  logger.info({ groupId: group._id, name, memberCount: allMembers.length }, 'Grupo creado');
  return group;
}

export async function listGroups(userId: string): Promise<IGroup[]> {
  return Group.find({ members: userId }).sort({ updatedAt: -1 }).lean() as unknown as IGroup[];
}

export async function getGroupById(groupId: string): Promise<IGroup> {
  const group = await Group.findById(groupId).lean() as IGroup | null;
  if (!group) throw new AppError(404, 'Grupo no encontrado');
  return group;
}

export async function addMembers(groupId: string, requesterId: string, newMemberIds: string[]): Promise<IGroup> {
  const group = await Group.findById(groupId);
  if (!group) throw new AppError(404, 'Grupo no encontrado');
  if (!group.members.includes(requesterId)) throw new AppError(403, 'No eres miembro del grupo');

  const added: string[] = [];
  for (const id of newMemberIds) {
    if (!group.members.includes(id)) {
      group.members.push(id);
      added.push(id);
    }
  }

  if (added.length > 0) {
    await group.save();
    logger.info({ groupId, added }, 'Miembros agregados al grupo');
  }

  return group.toObject() as IGroup;
}

export async function removeMember(groupId: string, requesterId: string, targetId: string): Promise<void> {
  const group = await Group.findById(groupId);
  if (!group) throw new AppError(404, 'Grupo no encontrado');
  if (group.createdBy !== requesterId) throw new AppError(403, 'Solo el creador puede eliminar miembros');
  if (targetId === group.createdBy) throw new AppError(400, 'No puedes eliminar al creador');

  group.members = group.members.filter((id) => id !== targetId);
  await group.save();

  logger.info({ groupId, removedMember: targetId }, 'Miembro eliminado del grupo');
}
