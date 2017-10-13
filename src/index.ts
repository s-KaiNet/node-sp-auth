import * as Promise from 'bluebird';

import { IAuthResponse } from './auth/IAuthResponse';
import { IAuthOptions } from './auth/IAuthOptions';
import { AuthResolverFactory } from './auth/AuthResolverFactory';

export function getAuth(url: string, options?: IAuthOptions): Promise<IAuthResponse> {
  return AuthResolverFactory.resolve(url, options).getAuth();
}

export * from './auth/IAuthOptions';
export * from './auth/IAuthResponse';
export * from './utils/TokenHelper';
export * from './auth/base';
