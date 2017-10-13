import * as Promise from 'bluebird';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as url from 'url';

import { IAuthResolver } from './../IAuthResolver';
import { IOnPremiseAddinCredentials } from './../IAuthOptions';
import { IAuthResponse } from './../IAuthResponse';
import { Cache } from './../../utils/Cache';
import * as consts from './../../Consts';

export class OnpremiseAddinOnly implements IAuthResolver {
  private static TokenCache: Cache = new Cache();

  constructor(private _siteUrl: string, private _authOptions: IOnPremiseAddinCredentials) { }

  public getAuth(): Promise<IAuthResponse> {

      let sharepointhostname: string = url.parse(this._siteUrl).host;
      let audience = `${consts.SharePointServicePrincipal}/${sharepointhostname}@${this._authOptions.realm}`;
      let fullIssuerIdentifier = `${this._authOptions.issuerId}@${this._authOptions.realm}`;

      let options: any = {
        key: fs.readFileSync(this._authOptions.rsaPrivateKeyPath)
      };

      let dateref: number = parseInt(((new Date()).getTime() / 1000).toString(), 10);

      let rs256: any = {
        typ: 'JWT',
        alg: 'RS256',
        x5t: this._authOptions.shaThumbprint
      };

      let actortoken: any = {
        aud: audience,
        iss: fullIssuerIdentifier,
        nameid: this._authOptions.clientId + '@' + this._authOptions.realm,
        nbf: (dateref - consts.HighTrustTokenLifeTime).toString(),
        exp: (dateref + consts.HighTrustTokenLifeTime).toString(),
        trustedfordelegation: true
      };

      let cacheKey: string = actortoken.nameid;
      let cachedToken: string = OnpremiseAddinOnly.TokenCache.get<string>(cacheKey);
      let accessToken: string;

      if (cachedToken) {
        accessToken = cachedToken;
      } else {
        accessToken = jwt.sign(actortoken, options.key, { header: rs256 });
        OnpremiseAddinOnly.TokenCache.set(cacheKey, accessToken, consts.HighTrustTokenLifeTime - 60);
      }

      return Promise.resolve({
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
  };
}
