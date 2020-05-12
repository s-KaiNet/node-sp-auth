import * as jwt from 'jsonwebtoken';
import { parse as urlparse } from 'url';
import { request } from './../config';

import { IAppToken } from '../auth/base/IAppToken';
import { IOnlineAddinCredentials } from '../index';
import { IAccessToken } from '../auth/base/IAccessToken';
import * as consts from './../Consts';
import { IAuthData } from '../auth/base/IAuthData';

export class TokenHelper {
    public static verifyAppToken(spAppToken: string, oauth: IOnlineAddinCredentials, audience?: string): IAppToken {
        const secret = Buffer.from(oauth.clientSecret, 'base64');
        const token = jwt.verify(spAppToken, secret) as IAppToken;
        const realm = token.iss.substring(token.iss.indexOf('@') + 1);
        const validateAudience = !!audience;

        if (validateAudience) {
            const validAudience = `${oauth.clientId}/${audience}@${realm}`;
            if (validAudience !== token.aud) {
                throw new Error('SP app token validation failed: invalid audience');
            }
        }

        token.realm = realm;
        token.context = JSON.parse(token.appctx);
        return token;
    }

    public static getUserAccessToken(spSiteUrl: string, authData: IAuthData, oauth: IOnlineAddinCredentials): Promise<IAccessToken> {
        const spAuthority = urlparse(spSiteUrl).host;
        const resource = `${consts.SharePointServicePrincipal}/${spAuthority}@${authData.realm}`;
        const appId = `${oauth.clientId}@${authData.realm}`;
        const tokenService = urlparse(authData.securityTokenServiceUri);
        const tokenUrl = `${tokenService.protocol}//${tokenService.host}/${authData.realm}${tokenService.path}`;

        return request.post(tokenUrl, {
            form: {
                grant_type: 'refresh_token',
                client_id: appId,
                client_secret: oauth.clientSecret,
                refresh_token: authData.refreshToken,
                resource: resource
            }
        }).json<{access_token: string, expires_on: string}>()
            .then(data => {
                return {
                    value: data.access_token,
                    expireOn: new Date(parseInt(data.expires_on, 10))
                } as IAccessToken;
            });
    }

    public static getAppOnlyAccessToken(spSiteUrl: string, authData: IAuthData, oauth: IOnlineAddinCredentials): Promise<IAccessToken> {
        const spAuthority = urlparse(spSiteUrl).host;
        const resource = `${consts.SharePointServicePrincipal}/${spAuthority}@${authData.realm}`;
        const appId = `${oauth.clientId}@${authData.realm}`;
        const tokenService = urlparse(authData.securityTokenServiceUri);
        const tokenUrl = `${tokenService.protocol}//${tokenService.host}/${authData.realm}${tokenService.path}`;

        return request.post(tokenUrl, {
            form: {
                grant_type: 'client_credentials',
                client_id: appId,
                client_secret: oauth.clientSecret,
                scope: resource,
                resource: resource
            }
        }).json<{access_token: string, expires_on: string}>()
            .then(data => {
                return {
                    value: data.access_token,
                    expireOn: new Date(parseInt(data.expires_on, 10))
                } as IAccessToken;
            });
    }
}
