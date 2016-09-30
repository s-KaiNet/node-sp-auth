import { IAuthOptions } from './IAuthOptions';

import { IAuthResolver } from './IAuthResolver';
import { OnpremiseUserCredentials } from './resolvers/OnpremiseUserCredentials';
import { OnlineUserCredentials } from './resolvers/OnlineUserCredentials';
import { OnlineAddinOnly } from './resolvers/OnlineAddinOnly';
import { OnpremiseAddinOnly } from './resolvers/OnpremiseAddinOnly';
import * as authOptions from './IAuthOptions';

export class AuthResolverFactory {
  public resolve(siteUrl: string, options: IAuthOptions): IAuthResolver {

    if (authOptions.isUserCredentialsOnpremise(siteUrl, options)) {
      return new OnpremiseUserCredentials();
    }

    if (authOptions.isUserCredentialsOnline(siteUrl, options)) {
      return new OnlineUserCredentials();
    }

    if (authOptions.isAppOnlyOnline(options)) {
      return new OnlineAddinOnly();
    }

    if (authOptions.isAppOnlyOnpremise(options)) {
      return new OnpremiseAddinOnly();
    }

    throw new Error('Error while resolving authentication class');

  }
}
