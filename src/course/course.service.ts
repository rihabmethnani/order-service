import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Course, CourseDocument } from './entities/course.entity';
import { CreateCourseInput } from './dto/create.course.input';
import { UpdateCourseInput } from './dto/update.course.input';
import { GoogleMapsService } from '@/maps/google-maps.service';


@Injectable()
export class CourseService {
    constructor(@InjectModel(Course.name) private courseModel: Model<CourseDocument>,
  // private readonly googleMapsService: GoogleMapsService
) {}

  async create(createCourseInput: CreateCourseInput): Promise<Course> {
    if (!createCourseInput.orderIds || createCourseInput.orderIds.length > 10) {
      throw new BadRequestException('A course must have between 1 and 10 orders.');
    }
    const createdCourse = new this.courseModel(createCourseInput);
    return createdCourse.save();
  }
  
  async findAll(): Promise<Course[]> {
    return this.courseModel.find({ deletedAt: null }).exec();
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
  

  // async createOptimizedCourse(input: CreateCourseInput): Promise<Course> {
  //   const { driverId, pointDepart, pointArrivee } = input;
  
  //   // Validation des entrées
  //   if (!pointDepart || !pointArrivee || pointArrivee.length === 0) {
  //     throw new Error('pointDepart et pointArrivee sont requis');
  //   }
  
  //   // Appel à l'API de Google Maps pour obtenir l'itinéraire optimisé
  //   const result = await this.googleMapsService.getOptimizedRoute(pointDepart, pointArrivee);
  
  //   // Logs pour inspecter le résultat
  //   console.log('Google Maps API Result:', result);
  
  //   // Vérification de la validité de result.optimizedOrder
  //   if (!Array.isArray(result.optimizedOrder)) {
  //     throw new Error('La réponse de Google Maps est invalide, "optimizedOrder" est manquant ou mal formé.');
  //   }
  
  //   // Créer un nouveau cours avec l'ordre optimisé
  //   const newCourse = new this.courseModel({
  //     ...input,
  //     distance: result.distance / 1000, // en km
  //     duree: result.duration / 60, // en minutes
  //     pointArrivee: result.optimizedOrder.map(i => pointArrivee[i]), // ordonner les points d'arrivée selon l'ordre optimisé
  //   });
  
  //   // Sauvegarde du nouveau cours dans la base de données
  //   return newCourse.save();
  // }
  
  
}
