import { IAuthResponse } from './IAuthResponse';

export interface IAuthResolver {
  getAuth: () => Promise<IAuthResponse>;
}
