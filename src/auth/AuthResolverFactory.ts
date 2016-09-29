import { IAuthOptions } from './IAuthOptions';

import { IAuthResolver } from './IAuthResolver';
import { OnpremiseUserCredentials } from './resolvers/OnpremiseUserCredentials';
import { OnlineUserCredentials } from './resolvers/OnlineUserCredentials';
import { OnlineAppOnly } from './resolvers/OnlineAppOnly';
import { OnpremiseAppOnly } from './resolvers/OnpremiseAppOnly';
import * as authOptions from './IAuthOptions';

export class AuthResolverFactory {
  public resolve(options: IAuthOptions): IAuthResolver {

    if (authOptions.isUserCredentialsOnpremise(options)) {
      return new OnpremiseUserCredentials();
    }

    if (authOptions.isUserCredentialsOnline(options)) {
      return new OnlineUserCredentials();
    }

    if (authOptions.isAppOnlyOnline(options)) {
      return new OnlineAppOnly();
    }

    if (authOptions.isAppOnlyOnpremise(options)) {
      return new OnpremiseAppOnly();
    }

    throw new Error('Error while resolving authentication class');

  }
}
