import { IAuthOptions } from './IAuthOptions';
import { IAuthResolver } from './IAuthResolver';
import { OnpremiseFbaCredentials } from './resolvers/OnpremiseFbaCredentials';
import { OnpremiseUserCredentials } from './resolvers/OnpremiseUserCredentials';
import { OnlineUserCredentials } from './resolvers/OnlineUserCredentials';
import { OnlineAddinOnly } from './resolvers/OnlineAddinOnly';
import { OnpremiseAddinOnly } from './resolvers/OnpremiseAddinOnly';
import { AdfsCredentials } from './resolvers/AdfsCredentials';
import { OnDemand } from './resolvers/ondemand/OnDemand';
import * as authOptions from './IAuthOptions';
import { FileConfig } from './resolvers/FileConfig';

export class AuthResolverFactory {
  public static resolve(siteUrl: string, options?: IAuthOptions): IAuthResolver {

    if (!options) {
      return new FileConfig(siteUrl);
    }

    if (authOptions.isFbaCredentialsOnpremise(siteUrl, options)) {
      return new OnpremiseFbaCredentials(siteUrl, options);
    }

    if (authOptions.isUserCredentialsOnpremise(siteUrl, options)) {
      return new OnpremiseUserCredentials(siteUrl, options);
    }

    if (authOptions.isUserCredentialsOnline(siteUrl, options)) {
      return new OnlineUserCredentials(siteUrl, options);
    }

    if (authOptions.isAddinOnlyOnline(options)) {
      return new OnlineAddinOnly(siteUrl, options);
    }

    if (authOptions.isAddinOnlyOnpremise(options)) {
      return new OnpremiseAddinOnly(siteUrl, options);
    }

    if (authOptions.isAdfsCredentials(options)) {
      return new AdfsCredentials(siteUrl, options);
    }

    if (authOptions.isOndemandCredentials(options)) {
      return new OnDemand(siteUrl, options);
    }

    throw new Error('Error while resolving authentication class');

  }
}
