import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import * as path from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  const port = process.env.PORT || 3000;
  const corsOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Shadowrun Matrix API')
    .setDescription('Backend API для LARP Матрица')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Serve admin panel static files at /panel
  // From dist/src, go up to monorepo root: ../../.. = apps/api, so ../../../admin/dist = apps/admin/dist
  const adminDistPath = path.join(__dirname, '..', '..', '..', 'admin', 'dist');
  if (fs.existsSync(adminDistPath)) {
    const fastifyInstance = app.getHttpAdapter().getInstance();

    await fastifyInstance.register(require('@fastify/static'), {
      root: adminDistPath,
      prefix: '/panel/',
      decorateReply: false,
    });

    // Redirect /panel to /panel/ so static index is served
    fastifyInstance.get('/panel', (req, reply) => {
      return reply.redirect(301, '/panel/');
    });

    fastifyInstance.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/panel')) {
        return (reply as any).sendFile('index.html', adminDistPath);
      }
      reply.code(404).send({ statusCode: 404, message: 'Not Found' });
    });

    console.log(`🖥️  Admin panel: http://localhost:${port}/panel`);
  } else {
    console.warn(`🖥️  Admin panel not found at ${adminDistPath} (build admin with: pnpm build:admin from repo root)`);
  }

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api`);
}

bootstrap();
