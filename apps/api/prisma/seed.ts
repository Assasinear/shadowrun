import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Очистка (опционально, для разработки)
  // await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE;`;

  // Создание пользователей
  const hashedPassword = await bcrypt.hash('password', 10);

  const gridgodUser = await prisma.user.upsert({
    where: { username: 'gridgod' },
    update: {},
    create: {
      username: 'gridgod',
      password: hashedPassword,
      role: 'GRIDGOD',
      persona: {
        create: {
          name: 'Grid God',
          avatar: 'https://via.placeholder.com/150',
          address: 'Matrix Core',
          profession: 'System Administrator',
          lls: {
            create: {
              sin: 'SIN-GRIDGOD-001',
              isPublic: true,
              iceLevel: 10,
            },
          },
          wallet: {
            create: {
              balance: 100000,
            },
          },
        },
      },
    },
    include: { persona: true },
  });

  const deckerUser = await prisma.user.upsert({
    where: { username: 'decker' },
    update: {},
    create: {
      username: 'decker',
      password: hashedPassword,
      role: 'DECKER',
      persona: {
        create: {
          name: 'Shadow Decker',
          avatar: 'https://via.placeholder.com/150',
          address: 'Underground',
          profession: 'Decker',
          lls: {
            create: {
              sin: 'SIN-DECKER-001',
              isPublic: false,
              iceLevel: 0,
            },
          },
          wallet: {
            create: {
              balance: 5000,
            },
          },
        },
      },
    },
    include: { persona: true },
  });

  const spiderUser = await prisma.user.upsert({
    where: { username: 'spider' },
    update: {},
    create: {
      username: 'spider',
      password: hashedPassword,
      role: 'SPIDER',
      persona: {
        create: {
          name: 'Spider Agent',
          avatar: 'https://via.placeholder.com/150',
          address: 'Corporate Host',
          profession: 'Spider',
          lls: {
            create: {
              sin: 'SIN-SPIDER-001',
              isPublic: false,
              iceLevel: 5,
            },
          },
          wallet: {
            create: {
              balance: 10000,
            },
          },
        },
      },
    },
    include: { persona: true },
  });

  const userUser = await prisma.user.upsert({
    where: { username: 'user' },
    update: {},
    create: {
      username: 'user',
      password: hashedPassword,
      role: 'USER',
      persona: {
        create: {
          name: 'Regular User',
          avatar: 'https://via.placeholder.com/150',
          address: 'Downtown',
          profession: 'Citizen',
          lls: {
            create: {
              sin: 'SIN-USER-001',
              isPublic: true,
              iceLevel: 0,
            },
          },
          wallet: {
            create: {
              balance: 2000,
            },
          },
        },
      },
    },
    include: { persona: true },
  });

  console.log('✅ Users created');

  // Создание хостов
  const host1 = await prisma.host.create({
    data: {
      name: 'Corporate Database',
      description: 'Main corporate database host',
      isPublic: true,
      ownerPersonaId: gridgodUser.persona!.id,
      spiderPersonaId: spiderUser.persona!.id,
      iceLevel: 5,
      wallet: {
        create: {
          balance: 50000,
        },
      },
    },
  });

  const host2 = await prisma.host.create({
    data: {
      name: 'Public Library',
      description: 'Public information host',
      isPublic: true,
      iceLevel: 2,
      wallet: {
        create: {
          balance: 10000,
        },
      },
    },
  });

  const host3 = await prisma.host.create({
    data: {
      name: 'Private Server',
      description: 'Private corporate server',
      isPublic: false,
      ownerPersonaId: spiderUser.persona!.id,
      iceLevel: 7,
      wallet: {
        create: {
          balance: 30000,
        },
      },
    },
  });

  console.log('✅ Hosts created');

  // Создание файлов
  await prisma.file.create({
    data: {
      name: 'secret_data.json',
      type: 'application/json',
      content: JSON.stringify({ secret: 'data', value: 123 }),
      isPublic: false,
      redeemCode: 'REDEEM-LLS-001',
      personaId: null, // "в луте"
      iceLevel: 0,
    },
  });

  await prisma.file.create({
    data: {
      name: 'public_info.txt',
      type: 'text/plain',
      content: 'Public information',
      isPublic: true,
      personaId: userUser.persona!.id,
      iceLevel: 0,
    },
  });

  await prisma.file.create({
    data: {
      name: 'host_file.dat',
      type: 'application/octet-stream',
      content: 'Binary data',
      isPublic: false,
      redeemCode: 'REDEEM-HOST-001',
      hostId: host1.id,
      iceLevel: 3,
    },
  });

  console.log('✅ Files created');

  // Создание устройств
  await prisma.device.create({
    data: {
      code: 'DEVICE-001',
      type: 'COMMLINK',
      name: 'Commlink Device',
      ownerPersonaId: null, // "в луте", можно привязать
      status: 'ACTIVE',
    },
  });

  await prisma.device.create({
    data: {
      code: 'DEVICE-002',
      type: 'DECK',
      name: 'Cyberdeck',
      ownerPersonaId: deckerUser.persona!.id,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Devices created');

  // Создание лицензий
  await prisma.license.create({
    data: {
      personaId: userUser.persona!.id,
      type: 'weapon',
      name: 'Firearms License',
      description: 'License to carry firearms',
      issuedBy: gridgodUser.persona!.id,
    },
  });

  await prisma.license.create({
    data: {
      personaId: deckerUser.persona!.id,
      type: 'decking',
      name: 'Decking License',
      description: 'License for decking operations',
      issuedBy: gridgodUser.persona!.id,
    },
  });

  console.log('✅ Licenses created');

  // Messages will be created through the API during testing
  console.log('✅ Messages skipped (will be created via API)');

  // Создание блог-постов
  await prisma.blogPost.create({
    data: {
      personaId: userUser.persona!.id,
      text: 'My first blog post in the Matrix!',
    },
  });

  await prisma.blogPost.create({
    data: {
      hostId: host1.id,
      text: 'Welcome to Corporate Database',
    },
  });

  console.log('✅ Blog posts created');

  // Создание подписки (persona -> persona)
  await prisma.subscription.create({
    data: {
      payerType: 'PERSONA',
      payerId: userUser.persona!.id,
      payeeType: 'PERSONA',
      payeeId: spiderUser.persona!.id,
      amountPerTick: 50,
      periodSeconds: 3600,
      type: 'SUBSCRIPTION',
    },
  });

  console.log('✅ Subscriptions created');

  // Создание логов
  await prisma.gridLog.create({
    data: {
      type: 'system_init',
      actorPersonaId: gridgodUser.persona!.id,
      metaJson: { message: 'System initialized' },
    },
  });

  await prisma.gridLog.create({
    data: {
      type: 'transfer',
      actorPersonaId: userUser.persona!.id,
      targetPersonaId: deckerUser.persona!.id,
      metaJson: { amount: 100 },
    },
  });

  console.log('✅ Grid logs created');

  // Дефолтные системные настройки
  const defaultSettings = [
    { key: 'subscription_period_seconds', value: '3600' },
    { key: 'brick_duration_seconds', value: '300' },
    { key: 'steal_percentage', value: '10' },
    { key: 'messenger_enabled', value: 'true' },
    { key: 'push_notifications_enabled', value: 'true' },
    { key: 'decking_enabled', value: 'true' },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSettings.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }

  console.log('✅ System settings created');

  console.log('🎉 Seed completed!');
  console.log('\n📋 Test accounts:');
  console.log('  - gridgod/gridgod (GRIDGOD)');
  console.log('  - decker/decker (DECKER)');
  console.log('  - spider/spider (SPIDER)');
  console.log('  - user/user (USER)');
  console.log('\n🔑 Device code for binding: DEVICE-001');
  console.log('📁 File redeem codes: REDEEM-LLS-001, REDEEM-HOST-001');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
