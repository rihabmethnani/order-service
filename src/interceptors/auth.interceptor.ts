// import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ForbiddenException } from '@nestjs/common';
// import { GqlExecutionContext } from '@nestjs/graphql';
// import { Observable } from 'rxjs';
// import * as jwt from 'jsonwebtoken';
// import { AuthHttpService } from '@/auth/auth-http/auth-http.service';
// import { UserHttpService } from '@/user/user-http/user-http.service';

// @Injectable()
// export class AuthInterceptor implements NestInterceptor {
//   constructor(
//     private readonly authHttpService: AuthHttpService,
//     private readonly userHttpService: UserHttpService,
//   ) {}

//   async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
//     let request;

//     if (context.getType<'http'>() === 'http') {
//       request = context.switchToHttp().getRequest();
//     } else if (context.getType<'graphql'>() === 'graphql') {
//       const gqlContext = GqlExecutionContext.create(context);
//       request = gqlContext.getContext().req;
//     }

//     if (!request) {
//       console.error('Request object not found');
//       throw new ForbiddenException('Request object not found');
//     }

//     const token = request.headers.authorization?.split(' ')[1];

//     if (!token) {
//       console.error('Aucun token trouvé dans l\'en-tête');
//       throw new ForbiddenException('No token provided');
//     }

//     // Valider le token
//     const isValid = await this.authHttpService.validateToken(token);
//     if (!isValid) {
//       console.error('Token invalide');
//       throw new ForbiddenException('Invalid token');
//     }

//     // Décoder le token pour obtenir l'ID de l'utilisateur
//     const payload = jwt.decode(token) as { sub: string; role: string };
//     if (!payload || !payload.sub) {
//       console.error('Token payload is invalid');
//       throw new ForbiddenException('Invalid token payload');
//     }

//     // Récupérer l'utilisateur à partir de l'ID
//     try {
//         const user = await this.userHttpService.getUserById(payload.sub, token);
//         if (!user) {
//           console.error('User not found');
//           throw new ForbiddenException('User not found');
//         }

//       // Attacher l'utilisateur à la requête
//       request.user = user;

//       return next.handle();
//     } catch (error) {
//       console.error('Failed to fetch user:', error);
//       throw new ForbiddenException('Failed to fetch user: ' + (error instanceof Error ? error.message : 'Unknown error'));
//     }
//   }
// }