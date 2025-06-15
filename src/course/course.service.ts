import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CoordinatesInput, Course, CourseDocument } from './entities/course.entity';
import { CreateCourseInput } from './dto/create.course.input';
import { UpdateCourseInput } from './dto/update.course.input';
import { GoogleMapsService } from '@/maps/google-maps.service';
import { Order, OrderDocument } from '@/order/entities/order.entity/order.entity';
import { RouteOptimizationService } from '@/route-optimization/route-optimization-service';
import { Coordinates } from '@/tracking/dto/coordinates.type';
import { OptimizationResultDto } from '@/route-optimization/dto/optimization-result.dto';

@Injectable()
export class CourseService {
    constructor(@InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly routeOptimizationService: RouteOptimizationService
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

  // Nouvelle méthode spécifique pour récupérer seulement les données de route
  async findCourseRoute(id: string): Promise<{ _id: string; route?: Coordinates[] }> {
    const course = await this.courseModel.findById(id).select('_id route').exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    
    return {
      _id: course._id.toString(),
      route: course.route || []
    };
  }

  // Méthode pour récupérer une course avec des champs spécifiques
  async findOneWithFields(id: string, fields?: string): Promise<Course> {
    let query = this.courseModel.findById(id);
    
    if (fields) {
      query = query.select(fields);
    }
    
    const course = await query.exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    return course;
  }
  
  
  async update(id: string, updateCourseInput: UpdateCourseInput): Promise<Course> {
    console.log(`Updating course ${id} with:`, updateCourseInput)

    const course = await this.courseModel.findByIdAndUpdate(id, updateCourseInput, { new: true }).exec()
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`)
    }

    console.log(`Updated course ${id}, route has ${course.route?.length || 0} points`)
    console.log(`Updated course ${id}, detailed route has ${course.detailedRoute?.length || 0} points`)
    return course
  }
  
  async remove(id: string): Promise<Course> {
    const course = await this.courseModel.findByIdAndDelete(id).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found.`);
    }
    return course;
  }
  
/**
 * Crée une course optimisée à partir d'une liste de commandes
 * @param input Données de création de la course
 * @returns Course optimisée
 */
async createOptimizedCourse(input: CreateCourseInput): Promise<Course> {
  const { orderIds, driverId, pointDepart } = input;

  if (!orderIds || orderIds.length === 0) {
    throw new BadRequestException("Au moins une commande est requise pour créer une course");
  }

  // Récupérer les commandes complètes depuis la base de données
  const orders = await this.orderModel.find({ _id: { $in: orderIds } }).exec();

  if (orders.length !== orderIds.length) {
    throw new NotFoundException("Certaines commandes n'ont pas été trouvées");
  }

  // Définir le point de départ par défaut si non fourni
  const startPoint: Coordinates = pointDepart ?? { lat: 36.8065, lng: 10.1815 }; // Tunis

  try {
    // Appeler l'optimiseur de route (ASYNC)
    const optimizationResult: OptimizationResultDto = await this.routeOptimizationService.optimizeRoute(startPoint, orders);

    // Créer les données de la course
    const courseData = {
      ...input,
      orderIds: optimizationResult.optimizedOrderIds,
      distance: optimizationResult.distance / 1000, // km
      duree: optimizationResult.duration / 60, // minutes
      pointDepart: startPoint,
      pointArrivee: optimizationResult.route.map((coord) => `${coord.lat},${coord.lng}`),
      route: optimizationResult.route.map(coord => ({
        lat: coord.lat ?? 0,
        lng: coord.lng ?? 0,
      })),
    };

    const createdCourse = new this.courseModel(courseData);
    return createdCourse.save();
  } catch (error) {
    // Si l'optimisation échoue, créer la course sans route optimisée
    console.warn('Route optimization failed, creating course without optimized route:', error);
    
    const courseData = {
      ...input,
      pointDepart: startPoint,
      route: [], // Route vide si l'optimisation échoue
    };

    const createdCourse = new this.courseModel(courseData);
    return createdCourse.save();
  }
}

/**
 * Optimise une course existante
 * @param courseId ID de la course à optimiser
 * @param pointDepart Point de départ (optionnel)
 * @returns Course optimisée
 */
async optimizeExistingCourse(courseId: string, pointDepart?: { lat: number; lng: number }): Promise<Course> {
  // Récupérer la course existante
  const course = await this.courseModel.findById(courseId).exec();
  if (!course) {
    throw new NotFoundException(`Course with ID ${courseId} not found.`);
  }

  // Récupérer les commandes associées
  const orders = await this.orderModel.find({ _id: { $in: course.orderIds } }).exec();

  // Point de départ par défaut si non fourni
  const startPoint = pointDepart ?? course.pointDepart ?? { lat: 36.8065, lng: 10.1815 };

  try {
    // Optimisation de l'itinéraire (ASYNC)
    const optimizationResult: OptimizationResultDto = await this.routeOptimizationService.optimizeRoute(startPoint, orders);

    // Mise à jour de la course
    course.orderIds = optimizationResult.optimizedOrderIds;
    course.distance = optimizationResult.distance / 1000;
    course.duree = optimizationResult.duration / 60;
    course.pointDepart = startPoint;
    course.pointArrivee = optimizationResult.route.map(coord => `${coord.lat},${coord.lng}`);
    course.route = optimizationResult.route.map(coord => ({
      lat: coord.lat ?? 0,
      lng: coord.lng ?? 0,
    }));

    return course.save();
  } catch (error) {
    console.warn('Route optimization failed for existing course:', error);
    
    // Si l'optimisation échoue, mettre à jour seulement les champs de base
    course.pointDepart = startPoint;
    course.route = course.route || []; // Garder la route existante ou initialiser un tableau vide
    
    return course.save();
  }
}



 /**
   * Méthode pour migrer les courses existantes et ajouter le champ route
   */
  async migrateExistingCourses(): Promise<void> {
    console.log("Starting migration of existing courses...")

    const coursesWithoutRoute = await this.courseModel
      .find({
        $or: [{ route: { $exists: false } }, { route: { $size: 0 } }],
      })
      .exec()

    console.log(`Found ${coursesWithoutRoute.length} courses without route`)

    for (const course of coursesWithoutRoute) {
      try {
        await this.optimizeExistingCourse(course._id.toString())
        console.log(`Migrated course ${course._id}`)
      } catch (error) {
        console.error(`Failed to migrate course ${course._id}:`, error)
      }
    }

    console.log("Migration completed")
  }

 async optimizeCourseWithStartPoint(courseId: string, startPoint: Coordinates): Promise<Course> {
    console.log(`Optimizing course ${courseId} with start point:`, startPoint)

    // Validation des paramètres d'entrée
    if (!courseId) {
      throw new BadRequestException("Course ID is required")
    }

    if (!startPoint || !startPoint.lat || !startPoint.lng) {
      throw new BadRequestException("Valid start point coordinates are required")
    }

    const course = await this.courseModel.findById(courseId).exec()
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found.`)
    }

if (!course.orderIds || course.orderIds.length === 0) {
  throw new BadRequestException("Course does not contain any order IDs")
}
    // Récupérer les commandes associées
    const orders = await this.orderModel.find({ _id: { $in: course.orderIds } }).exec()
    console.log(`Found ${orders.length} orders for course optimization`)

    if (orders.length === 0) {
      throw new BadRequestException("No orders found for this course")
    }

    try {
      console.log("Starting route optimization with detailed routing...")
      const optimizationResult: OptimizationResultDto = await this.routeOptimizationService.optimizeRoute(
        startPoint,
        orders,
      )

      console.log("Optimization result:", {
        ...optimizationResult,
        detailedRouteLength: optimizationResult.detailedRoute?.length,
      })

      // Vérifier que la route contient des points
      if (!optimizationResult.route || optimizationResult.route.length < 2) {
        throw new BadRequestException("Optimization failed: no valid route generated")
      }

      // Vérifier que la route détaillée contient des points
     if (!optimizationResult.detailedRoute || optimizationResult.detailedRoute.length < 2) {
        console.warn("No detailed route generated, using basic route")
        optimizationResult.detailedRoute = optimizationResult.route.map(coord => ({
          lat: coord.lat ?? 0,
          lng: coord.lng ?? 0,
        }))
      }


      // Mettre à jour la course avec les résultats de l'optimisation
      const updateData = {
        orderIds: optimizationResult.optimizedOrderIds,
        distance: optimizationResult.distance / 1000, // Convertir en km
        duree: optimizationResult.duration / 60, // Convertir en minutes
        pointDepart: startPoint,
        pointArrivee: optimizationResult.route.slice(1).map((coord) => `${coord.lat},${coord.lng}`), // Exclure le point de départ
        route: optimizationResult.route.map((coord) => ({
          lat: coord.lat ?? 0,
          lng: coord.lng ?? 0,
        })),
        detailedRoute: optimizationResult.detailedRoute.map((coord) => ({
          lat: coord.lat ?? 0,
          lng: coord.lng ?? 0,
        })),
      }

      console.log("Update data:", {
        ...updateData,
        routeLength: updateData.route.length,
        detailedRouteLength: updateData.detailedRoute.length,
      })

      // Vérifier que les routes sont valides avant de mettre à jour
      if (!updateData.route || updateData.route.length < 2) {
        throw new BadRequestException("Invalid route data")
      }

      if (!updateData.detailedRoute || updateData.detailedRoute.length < 2) {
        throw new BadRequestException("Invalid detailed route data")
      }

      // Mise à jour directe avec le modèle Mongoose
      const updatedCourse = await this.courseModel
        .findByIdAndUpdate(
          courseId,
          {
            $set: {
              orderIds: updateData.orderIds,
              distance: updateData.distance,
              duree: updateData.duree,
              pointDepart: updateData.pointDepart,
              pointArrivee: updateData.pointArrivee,
              route: updateData.route,
              detailedRoute: updateData.detailedRoute,
            },
          },
          { new: true },
        )
        .exec()

      if (!updatedCourse) {
        throw new NotFoundException(`Failed to update course ${courseId}`)
      }

      console.log(`Updated course with route: ${updatedCourse.route?.length || 0} points`)
      console.log(`Updated course with detailed route: ${updatedCourse.detailedRoute?.length || 0} points`)

      // Vérification supplémentaire
      const verifiedCourse = await this.courseModel.findById(courseId).exec()
    if (!verifiedCourse) {
  throw new NotFoundException(`Course with ID ${courseId} not found after update`)
}

console.log(`Verified course route has ${verifiedCourse.route?.length || 0} points`)

      // S'assurer que les routes sont bien présentes avant de retourner
      if (!updatedCourse.route || updatedCourse.route.length < 2) {
        console.error("Route was not properly saved to database")
        throw new BadRequestException("Failed to save optimized route")
      }

      if (!updatedCourse.detailedRoute || updatedCourse.detailedRoute.length < 2) {
        console.error("Detailed route was not properly saved to database")
        throw new BadRequestException("Failed to save detailed route")
      }

      return updatedCourse
    } catch (error) {
      console.error("Route optimization failed:", error)
      throw new BadRequestException(`Impossible d'optimiser la course: ${(error as Error).message}`)
    }
  }

  /**
   * Récupère les courses d'un driver pour une période donnée
   */
   async findCoursesByDriverAndDate(driverId: string, startDate: Date, endDate: Date): Promise<Course[]> {
    return this.courseModel
      .find({
        driverId,
        createdAt: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .exec()
  }
  async findWithOrders(query: any, populateOptions: string | string[] = "orderIds"): Promise<Course[]> {
    return this.courseModel.find(query).populate(populateOptions).exec()
  }

  /**
   * Récupère toutes les courses d'un driver
   */
  async getCoursesByDriverId(driverId: string): Promise<Course[]> {
    const courses = await this.courseModel.find({ driverId, deletedAt: null }).exec()
    if (!courses || courses.length === 0) {
      throw new NotFoundException(`Aucune course trouvée pour le conducteur avec l'ID ${driverId}.`)
    }
    return courses
  }

  /**
   * Récupère les détails complets d'une course avec les informations des clients
   */
  async getCourseWithClientDetails(courseId: string): Promise<any> {
    const course = await this.courseModel.findById(courseId).exec()
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found.`)
    }

    // Récupérer les commandes avec les détails des clients
    const orders = await this.orderModel.find({ _id: { $in: course.orderIds } }).exec()

    return {
      ...course.toObject(),
      orders,
    }
  }

}