import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CourseService } from './course.service';
import { CourseResolver } from './course.resolver';
import { Course, CourseSchema } from './entities/course.entity';

@Module({
    imports: [
      MongooseModule.forFeature([{ name: Course.name, schema: CourseSchema }]),
    ],
    providers: [CourseService, CourseResolver],
    exports: [CourseService, MongooseModule], 
  })
  export class CourseModule {}