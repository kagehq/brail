import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

const MANAGER_ROLES = new Set(['owner', 'admin']);
const OWNER_ROLE = 'owner';

@Injectable()
export class OrgsService {
  private readonly logger = new Logger(OrgsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCurrentOrg(userId: string) {
    const membership = await this.prisma.orgMember.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      throw new NotFoundException('User has no organization');
    }

    const org = await this.prisma.org.findUnique({
      where: { id: membership.orgId },
      include: {
        members: {
          include: { user: true },
        },
        invites: {
          where: { status: 'pending' },
        },
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt,
      currentMember: {
        id: membership.id,
        userId: membership.userId,
        role: membership.role,
      },
      members: org.members
        .map((member) => this.mapMember(member))
        .sort((a, b) => a.email.localeCompare(b.email)),
      invites: org.invites
        .map((invite) => this.mapInvite(invite))
        .sort((a, b) => a.email.localeCompare(b.email)),
    };
  }

  async inviteMember(
    orgId: string,
    actorId: string,
    email: string,
    role: string = 'member',
  ) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!this.isValidEmail(normalizedEmail)) {
      throw new BadRequestException('Invalid email address');
    }

    const normalizedRole = this.normalizeRole(role);
    const actorMembership = await this.ensureCanManage(orgId, actorId);

    if (normalizedRole === OWNER_ROLE && actorMembership.role !== OWNER_ROLE) {
      throw new ForbiddenException('Only owners can invite new owners');
    }

    const existingMember = await this.prisma.orgMember.findFirst({
      where: {
        orgId,
        user: { email: normalizedEmail },
      },
    });

    if (existingMember) {
      throw new BadRequestException('User is already a member of this organization');
    }

    const existingInvite = await this.prisma.orgInvite.findUnique({
      where: {
        orgId_email: {
          orgId,
          email: normalizedEmail,
        },
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user) {
      const member = await this.prisma.$transaction(async (tx) => {
        if (existingInvite) {
          await tx.orgInvite.update({
            where: { id: existingInvite.id },
            data: {
              status: 'accepted',
              respondedAt: new Date(),
            },
          });
        }

        return tx.orgMember.create({
          data: {
            orgId,
            userId: user.id,
            role: normalizedRole,
          },
          include: {
            user: true,
          },
        });
      });

      this.logger.log(`Added ${normalizedEmail} to org ${orgId} as ${normalizedRole}`);
      return { member: this.mapMember(member) };
    }

    const token = randomBytes(20).toString('hex');

    const invite = await this.prisma.orgInvite.upsert({
      where: {
        orgId_email: {
          orgId,
          email: normalizedEmail,
        },
      },
      update: {
        role: normalizedRole,
        status: 'pending',
        token,
        invitedBy: actorMembership.userId,
        respondedAt: null,
      },
      create: {
        orgId,
        email: normalizedEmail,
        role: normalizedRole,
        token,
        invitedBy: actorMembership.userId,
      },
    });

    this.logger.log(`Invited ${normalizedEmail} to org ${orgId} as ${normalizedRole}`);
    return { invite: this.mapInvite(invite) };
  }

  async cancelInvite(orgId: string, actorId: string, inviteId: string) {
    await this.ensureCanManage(orgId, actorId);

    const invite = await this.prisma.orgInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.orgId !== orgId) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.status !== 'pending') {
      return { status: invite.status };
    }

    await this.prisma.orgInvite.update({
      where: { id: inviteId },
      data: {
        status: 'cancelled',
        respondedAt: new Date(),
      },
    });

    return { success: true };
  }

  async removeMember(orgId: string, actorId: string, memberId: string) {
    const actorMembership = await this.ensureCanManage(orgId, actorId);

    const member = await this.prisma.orgMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.orgId !== orgId) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === OWNER_ROLE) {
      if (actorMembership.role !== OWNER_ROLE) {
        throw new ForbiddenException('Only owners can remove another owner');
      }

      const ownerCount = await this.prisma.orgMember.count({
        where: { orgId, role: OWNER_ROLE },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('At least one owner is required');
      }
    }

    await this.prisma.orgMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  }

  async updateMemberRole(
    orgId: string,
    actorId: string,
    memberId: string,
    role: string,
  ) {
    const normalizedRole = this.normalizeRole(role);
    const actorMembership = await this.ensureCanManage(orgId, actorId);

    const member = await this.prisma.orgMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!member || member.orgId !== orgId) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === normalizedRole) {
      return this.mapMember(member);
    }

    if (normalizedRole === OWNER_ROLE && actorMembership.role !== OWNER_ROLE) {
      throw new ForbiddenException('Only owners can promote a member to owner');
    }

    if (member.role === OWNER_ROLE && normalizedRole !== OWNER_ROLE) {
      const ownerCount = await this.prisma.orgMember.count({
        where: { orgId, role: OWNER_ROLE },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('At least one owner is required');
      }
    }

    if (
      member.userId === actorId &&
      actorMembership.role === OWNER_ROLE &&
      normalizedRole !== OWNER_ROLE
    ) {
      const ownerCount = await this.prisma.orgMember.count({
        where: { orgId, role: OWNER_ROLE },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Assign another owner before changing your own role',
        );
      }
    }

    const updated = await this.prisma.orgMember.update({
      where: { id: memberId },
      data: { role: normalizedRole },
      include: { user: true },
    });

    return this.mapMember(updated);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private normalizeRole(role?: string): 'owner' | 'admin' | 'member' {
    if (!role) {
      return 'member';
    }

    const normalized = role.toLowerCase();

    if (normalized === 'owner' || normalized === 'admin' || normalized === 'member') {
      return normalized as 'owner' | 'admin' | 'member';
    }

    throw new BadRequestException('Invalid role');
  }

  private async ensureCanManage(orgId: string, userId: string) {
    const membership = await this.prisma.orgMember.findFirst({
      where: { orgId, userId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (!MANAGER_ROLES.has(membership.role)) {
      throw new ForbiddenException('Only owners or admins can manage team access');
    }

    return membership;
  }

  private mapMember(member: any) {
    return {
      id: member.id,
      userId: member.userId,
      email: member.user?.email || '',
      role: member.role,
      joinedAt: member.createdAt,
    };
  }

  private mapInvite(invite: any) {
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      status: invite.status,
      invitedBy: invite.invitedBy || null,
      createdAt: invite.createdAt,
      token: invite.status === 'pending' ? invite.token : null,
    };
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
