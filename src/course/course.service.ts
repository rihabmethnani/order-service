import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './entities/course.entity';
import { CreateCourseInput } from './dto/create.course.input';
import { UpdateCourseInput } from './dto/update.course.input';


@Injectable()
export class CourseService {
    constructor(@InjectModel(Course.name) private courseModel: Model<CourseDocument>) {}

  async create(createCourseInput: CreateCourseInput): Promise<Course> {
    if (!createCourseInput.orderIds || createCourseInput.orderIds.length > 10) {
      throw new BadRequestException('A course must have between 1 and 10 orders.');
    }
    const createdCourse = new this.courseModel(createCourseInput);
    return createdCourse.save();
  }
  
  async findAll(): Promise<Course[]> {
    return this.courseModel.find().exec();
  }
  
  async findOne(id: string): Promise<Course> {
    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    return course;
  }
  
  async update(id: string, updateCourseInput: UpdateCourseInput): Promise<Course> {
    const course = await this.courseModel.findByIdAndUpdate(id, updateCourseInput, { new: true }).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    return course;
  }
  
  async remove(id: string): Promise<Course> {
    const course = await this.courseModel.findByIdAndDelete(id).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    return course;
  }
  
}
