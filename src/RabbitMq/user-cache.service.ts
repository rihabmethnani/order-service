import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';
import axios, { AxiosError } from 'axios';

export interface User {
  _id: string;
  email: string;
  role: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UserCacheService implements OnModuleInit, OnModuleDestroy {
  private redisClient;

  constructor() {
    this.redisClient = createClient({
      url: 'redis://localhost:6379',
    });

    this.redisClient.on('error', (err) => {
      console.error('❌ Erreur Redis:', err);
    });
  }

  async onModuleInit() {
    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
        console.log('✅ Connexion Redis réussie.');
      } else {
        console.log('✅ Redis est déjà connecté.');
      }
    } catch (error) {
      console.error('❌ Échec de connexion à Redis:', error);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.redisClient.isOpen) {
        await this.redisClient.quit();
        console.log('🔌 Déconnexion de Redis.');
      } else {
        console.log('⚠️ Redis n’était pas connecté.');
      }
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion de Redis:', error);
    }
  }

  async getJwtToken(): Promise<string> {
    const graphqlEndpoint = 'http://localhost:4000/graphql';
    const loginQuery = `
      mutation Login {
        login(email: "superAdmin@superAdmin.com", password: "superAdmin123") {
          access_token
        }
      }
    `;

    try {
      const response = await axios.post(graphqlEndpoint, { query: loginQuery });

      if (!response.data?.data?.login?.access_token) {
        throw new Error('Invalid login response: Missing access_token');
      }

      return response.data.data.login.access_token;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('❌ Échec de récupération du JWT:', error.response?.data || error.message);
      } else {
        console.error('❌ Erreur inattendue:', error);
      }
      throw new Error('Impossible de récupérer le JWT');
    }
  }

  async initializeCache() {
    try {
      if (!this.redisClient.isOpen) {
        console.log("🔌 Redis client not connected, trying to reconnect...");
        await this.redisClient.connect();
      }

      const graphqlEndpoint = 'http://localhost:4000/graphql';
      const jwtToken = await this.getJwtToken();

      const query = `
        query GetAllUsers {
          getAllUsers {
            _id
            name
            email
            role
          }
        }
      `;

      const response = await axios.post(
        graphqlEndpoint,
        { query },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.errors) {
        console.error('❌ Erreurs GraphQL:', response.data.errors);
        throw new Error('GraphQL error');
      }

      const users = response.data?.data?.getAllUsers;
      if (!users || !Array.isArray(users)) {
        console.error('❌ Réponse GraphQL invalide:', JSON.stringify(response.data, null, 2));
        throw new Error('Invalid GraphQL response: Missing or malformed users data');
      }

      for (const user of users) {
        await this.setUserById(user._id, user);
      }

      console.log('✅ Cache Redis initialisé avec tous les utilisateurs.');
    } catch (error) {
      console.error('❌ Échec de l’initialisation du cache Redis:', error);
    }
  }

  async getUserById(id: string): Promise<any> {
    try {
      const data = await this.redisClient.get(`user:${id}`);
      if (!data) {
        console.warn(`⚠️ Utilisateur non trouvé dans le cache: ${id}. Récupération via GraphQL...`);
        const user = await this.fetchUserFromGraphQL(id);
        if (user) {
          await this.setUserById(id, user);
        }
        return user;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l’utilisateur depuis Redis:', error);
      throw error;
    }
  }
  private async fetchUserFromGraphQL(id: string): Promise<any> {
    const graphqlEndpoint = 'http://localhost:4000/graphql';
    const jwtToken = await this.getJwtToken();

    const query = `
      query GetUserById {
        getUserById(id: "${id}") {
          _id
          name
          email
          role
          zoneResponsabilite
          address
          city
          postalCode
          region
        }
      }
    `;

    try {
      const response = await axios.post(
        graphqlEndpoint,
        { query },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.errors) {
        console.error('❌ Erreur GraphQL:', response.data.errors);
        return null;
      }

      return response.data.data.getUserById;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l’utilisateur via GraphQL:', error);
      return null;
    }
  }

  async setUserById(id: string, user: User): Promise<void> {
    try {
      await this.redisClient.set(`user:${id}`, JSON.stringify(user), { EX: 3600 });
    } catch (error) {
      console.error('❌ Erreur lors de l’enregistrement de l’utilisateur dans Redis:', error);
      throw error;
    }
  }

  async deleteUserById(id: string): Promise<void> {
    try {
      await this.redisClient.del(`user:${id}`);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de l’utilisateur de Redis:', error);
      throw error;
    }
  }
}