import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdatePersonaDto, TogglePublicDto, BlogPostDto, RedeemFileDto } from './dto/persona.dto';
import { QrService } from './qr.service';

@Injectable()
export class PersonaService {
  constructor(
    private prisma: PrismaService,
    private qrService: QrService,
  ) {}

  async getMe(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: {
        lls: true,
        wallet: true,
        devices: true,
        licenses: true,
        blogPosts: { orderBy: { createdAt: 'desc' }, take: 20 },
        files: true,
      },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    return persona;
  }

  async updateMe(personaId: string, dto: UpdatePersonaDto) {
    return this.prisma.persona.update({
      where: { id: personaId },
      data: {
        address: dto.address,
        profession: dto.profession,
        extraInfo: dto.extraInfo,
      },
    });
  }

  async togglePublic(personaId: string, dto: TogglePublicDto) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: { lls: true },
    });

    if (!persona || !persona.lls) {
      throw new NotFoundException('Persona or LLS not found');
    }

    await this.prisma.lls.update({
      where: { personaId },
      data: { isPublic: dto.isPublic },
    });

    return { isPublic: dto.isPublic };
  }

  async getPublicPersona(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: {
        lls: { where: { isPublic: true } },
        blogPosts: { orderBy: { createdAt: 'desc' }, take: 20 },
        files: { where: { isPublic: true } },
      },
    });

    if (!persona || !persona.lls) {
      throw new NotFoundException('Public persona not found');
    }

    return {
      id: persona.id,
      name: persona.name,
      avatar: persona.avatar,
      sin: persona.lls.sin,
      blogPosts: persona.blogPosts,
      files: persona.files,
    };
  }

  async getMyBlog(personaId: string) {
    return this.prisma.blogPost.findMany({
      where: { personaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBlogPost(personaId: string, dto: BlogPostDto) {
    if (dto.text.length > 70) {
      throw new BadRequestException('Blog post text must be <= 70 characters');
    }

    const post = await this.prisma.blogPost.create({
      data: {
        personaId,
        text: dto.text,
      },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'blog_post_created',
        actorPersonaId: personaId,
        metaJson: { postId: post.id },
      },
    });

    return post;
  }

  async getPersonaBlog(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
    });

    if (!persona) {
      throw new NotFoundException('Persona not found');
    }

    return this.prisma.blogPost.findMany({
      where: { personaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyFiles(personaId: string) {
    return this.prisma.file.findMany({
      where: { personaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async redeemFile(personaId: string, dto: RedeemFileDto) {
    const file = await this.prisma.file.findUnique({
      where: { redeemCode: dto.redeemCode },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.personaId) {
      throw new BadRequestException('File already redeemed');
    }

    const updatedFile = await this.prisma.file.update({
      where: { id: file.id },
      data: { personaId },
    });

    await this.prisma.gridLog.create({
      data: {
        type: 'file_redeemed',
        actorPersonaId: personaId,
        metaJson: { fileId: file.id, redeemCode: dto.redeemCode },
      },
    });

    return updatedFile;
  }

  async toggleFilePublic(personaId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file || file.personaId !== personaId) {
      throw new ForbiddenException('File not found or access denied');
    }

    return this.prisma.file.update({
      where: { id: fileId },
      data: { isPublic: !file.isPublic },
    });
  }

  async createSinQr(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      include: { lls: true },
    });

    if (!persona || !persona.lls) {
      throw new NotFoundException('Persona or LLS not found');
    }

    const payload = {
      type: 'SIN',
      personaId: persona.id,
      sin: persona.lls.sin,
      name: persona.name,
    };

    return this.qrService.createQrToken('SIN', payload);
  }
}
