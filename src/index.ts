import * as Promise from 'bluebird';

import { IAuthResponse } from './auth/IAuthResponse';
import { IAuthOptions } from './auth/IAuthOptions';
import { AuthResolverFactory } from './auth/AuthResolverFactory';

export function getHeaders(options: IAuthOptions): Promise<IAuthResponse> {
  let factory: AuthResolverFactory = new AuthResolverFactory();

  return factory.resolve(options).getAuthHeaders(options);
}
