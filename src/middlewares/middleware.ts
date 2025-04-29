import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import axios from 'axios';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req;

    try {
      const token = request.headers.authorization?.split(' ')[1]; // Extraire le token JWT
      if (!token) {
        throw new Error('Missing JWT token');
      }

      // Appeler l'endpoint `validateToken` dans `user-service`
      const response = await axios.post(
        'http://localhost:4000/graphql',
        {
          query: `
            query ValidateToken {
              validateToken {
                _id
                email
                role
              }
            }
          `,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.errors) {
        console.error('❌ Erreur lors de la validation du token:', response.data.errors);
        return false;
      }

      const user = response.data.data.validateToken;
      request.user = user; // Ajouter l'utilisateur au contexte
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la validation du token JWT:', error);
      return false;
    }
  }
}