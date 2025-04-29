import { NestFactory } from '@nestjs/core';
import { RabbitMQConsumer } from './RabbitMq/rabbitmq.consumer';
import { UserCacheService } from './RabbitMq/user-cache.service';
import { AppModule } from './app.module';
import { JwtAuthGuard } from './middlewares/middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Initialiser le cache Redis
  const userCacheService = app.get(UserCacheService);
  await userCacheService.initializeCache();

  // Initialiser le consommateur RabbitMQ
  const rabbitMQConsumer = app.get(RabbitMQConsumer);
  //await rabbitMQConsumer.init();
  app.useGlobalGuards(new JwtAuthGuard());
  // Activez CORS avec une configuration spécifique
  app.enableCors({
    origin: 'http://localhost:3000', // Autorise uniquement le frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Méthodes HTTP autorisées
    allowedHeaders: ['Content-Type', 'Authorization'], // Headers autorisés
    credentials: true, // Autorise les cookies ou les tokens d'authentification
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
