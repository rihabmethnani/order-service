// import { Injectable } from '@nestjs/common';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';

// @Injectable()
// export class AuthHttpService {
//   constructor(private readonly httpService: HttpService) {}

//   async validateToken(token: string): Promise<boolean> {
//     console.log('Token reçu pour validation:', token); // Log du token reçu

//     try {
//       const response = await firstValueFrom(
//         this.httpService.post(
//           'http://localhost:3000/graphql',
//           {
//             query: `
//               mutation {
//                 validateToken(token: "${token}")
//               }
//             `,
//           },
//           {
//             headers: { 'Content-Type': 'application/json' },
//           },
//         ),
//       );
//       console.log('Validation response:', response.data); // Log de la réponse
//       return response.data.data.validateToken;
//     } catch (error) {
//       console.error('Token validation failed:', error);
//       return false;
//     }
//   }
// }