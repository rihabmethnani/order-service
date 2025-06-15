import { Resolver, Query, Mutation, Args, ResolveField, Parent } from '@nestjs/graphql';
import { CourseService } from './course.service';
import { CoordinatesInput, Course } from './entities/course.entity';
import { CreateCourseInput } from './dto/create.course.input';
import { UpdateCourseInput } from './dto/update.course.input';

@Resolver(() => Course)
export class CourseResolver {
  constructor(private readonly courseService: CourseService) {}

  @Mutation(() => Course)
  createCourse(@Args('createCourseInput') createCourseInput: CreateCourseInput) {
    return this.courseService.create(createCourseInput);
  }

  @Query(() => [Course], { name: 'courses' })
  findAll() {
    return this.courseService.findAll();
  }

  @Query(() => Course, { name: 'course' })
  async findOne(@Args('id', { type: () => String }) id: string) {
    return this.courseService.findOne(id);
  }

  // Nouvelle query spécifique pour récupérer seulement la route
  @Query(() => Course, { name: 'courseRoute' })
  async findCourseRoute(@Args('id', { type: () => String }) id: string) {
    return this.courseService.findCourseRoute(id);
  }

  // Query pour récupérer une course sans les données de route (plus rapide)
  @Query(() => Course, { name: 'courseBasic' })
  async findCourseBasic(@Args('id', { type: () => String }) id: string) {
    return this.courseService.findOneWithFields(id, '_id orderIds distance duree pointDepart status');
  }

  @Mutation(() => Course)
  updateCourse(
    @Args('id', { type: () => String }) id: string,
    @Args('updateCourseInput') updateCourseInput: UpdateCourseInput,
  ) {
    return this.courseService.update(id, updateCourseInput);
  }

  @Mutation(() => Course)
  removeCourse(@Args('id', { type: () => String }) id: string) {
    return this.courseService.remove(id);
  }

  @Mutation(() => Course)
  createOptimizedCourse(@Args('createCourseInput') createCourseInput: CreateCourseInput) {
    return this.courseService.createOptimizedCourse(createCourseInput);
  }

  @Mutation(() => Course)
  optimizeExistingCourse(
    @Args('courseId') courseId: string,
    @Args('pointDepart', { nullable: true }) pointDepart?: CoordinatesInput,
  ) {
    const validPointDepart = pointDepart?.lat !== undefined && pointDepart?.lng !== undefined
      ? { lat: pointDepart.lat, lng: pointDepart.lng }
      : undefined;
  
    return this.courseService.optimizeExistingCourse(courseId, validPointDepart);
  }

  @Query(() => [Course], { name: 'coursesByDriverId' })
  async getCoursesByDriverId(@Args('driverId', { type: () => String }) driverId: string) {
    return this.courseService.getCoursesByDriverId(driverId);
  }

  // Resolver de champ pour gérer le champ route de manière sécurisée
@ResolveField(() => [CoordinatesInput], { nullable: true })
async route(@Parent() course: Course) {
  // Si la route est déjà chargée, la retourner
  if (course.route !== undefined) {
    return course.route || [];
  }

  // Sinon, la charger spécifiquement
  try {
    const courseWithRoute = await this.courseService.findCourseRoute(course._id);
    return courseWithRoute.route || [];
  } catch (error) {
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    console.warn(`Could not load route for course ${course._id}:`, errorMessage);
    return [];
  }
}

  @Mutation(() => Course)
  optimizeCourseWithStartPoint(@Args('courseId') courseId: string, @Args('startPoint') startPoint: CoordinatesInput) {
    return this.courseService.optimizeCourseWithStartPoint(courseId, startPoint)
  }

}