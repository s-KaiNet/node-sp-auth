import * as Promise from 'bluebird';

import { IAuthResponse } from './auth/IAuthResponse';
import { IAuthOptions } from './auth/IAuthOptions';
import { AuthResolverFactory } from './auth/AuthResolverFactory';

export function getHeaders(url: string, options: IAuthOptions): Promise<IAuthResponse> {
  let factory: AuthResolverFactory = new AuthResolverFactory();

  return factory.resolve(url, options).getAuthHeaders(url, options);
}
