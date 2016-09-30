import * as Promise from 'bluebird';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as url from 'url';

import { IAuthResolver } from './../IAuthResolver';
import { IOnPremiseAddinCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';

export class OnpremiseAddinOnly implements IAuthResolver {

  private static HighTrustTokenLifeTime: number = 12 * 60 * 60;
  private static TokenCache: Cache = new Cache();
  private static SharePointServicePrincipal: string = '00000003-0000-0ff1-ce00-000000000000';

  public getAuthHeaders(siteUrl: string, authOptions: IOnPremiseAddinCredentials): Promise<IAuthResponse> {
    return new Promise<IAuthResponse>((resolve, reject) => {

      let sharepointhostname: string = url.parse(siteUrl).hostname;
      let audience: string = `${OnpremiseAddinOnly.SharePointServicePrincipal}/${sharepointhostname}@${authOptions.realm}`;
      let fullIssuerIdentifier: string = `${authOptions.issuerId}@${authOptions.realm}`;

      let options: any = {
        key: fs.readFileSync(authOptions.rsaPrivateKeyPath)
      };

      let dateref: number = parseInt(((new Date()).getTime() / 1000).toString(), 10);

      let rs256: any = {
        typ: 'JWT',
        alg: 'RS256',
        x5t: authOptions.shaThumbprint
      };

      let actortoken: any = {
        aud: audience,
        iss: fullIssuerIdentifier,
        nameid: authOptions.clientId + '@' + authOptions.realm,
        nbf: (dateref - OnpremiseAddinOnly.HighTrustTokenLifeTime).toString(),
        exp: (dateref + OnpremiseAddinOnly.HighTrustTokenLifeTime).toString(),
        trustedfordelegation: true
      };

      let cacheKey: string = actortoken.nameid;
      let cachedToken: string = OnpremiseAddinOnly.TokenCache.get<string>(cacheKey);
      let accessToken: string;

      if (cachedToken) {
        accessToken = cachedToken;
      } else {
        accessToken = jwt.sign(actortoken, options.key, { header: rs256 });
        OnpremiseAddinOnly.TokenCache.set(cacheKey, accessToken, OnpremiseAddinOnly.HighTrustTokenLifeTime - 60);
      }

      resolve({
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

    });
  };
}
