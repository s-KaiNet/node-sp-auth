import * as Promise from 'bluebird';

import {IAuthResponse} from './IAuthResponse';
import {IAuthOptions} from './IAuthOptions';

export interface IAuthResolver {
  getAuthHeaders: (siteUrl: string, authOptions: IAuthOptions) => Promise<IAuthResponse>;
}
