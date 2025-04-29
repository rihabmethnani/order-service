// src/app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { OrderModule } from './order/order.module';
import { OrderService } from './order/order.service';
import { OrderResolver } from './order/order.resolver';
import { JwtService } from '@nestjs/jwt';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { RabbitMQModule } from './RabbitMq/rabbitmq.module';
import { HistoryModule } from './history/history.module';
import { TrackingModule } from './tracking/tracking.module';
import { CourseModule } from './course/course.module';

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: 'schema.gql',
      context: ({ req }) => {
        return {
          req,
          jwtService: new JwtService({ secret: 'your_jwt_secret_key' }), // Injecter JwtService
        };
      },
    }),
    MongooseModule.forRoot('mongodb+srv://rihabmethnani89:OGMs6AwH6jTXyRWU@order-service-cluster.gxrwz.mongodb.net/order-service?retryWrites=true&w=majority'),
    HttpModule,
    OrderModule,
    RabbitMQModule,
    HistoryModule,
    TrackingModule,
    CourseModule,
  ],
})
export class AppModule {}