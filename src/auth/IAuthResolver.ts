import * as Promise from 'bluebird';

import {IAuthResponse} from './IAuthResponse';
import {IAuthOptions} from './IAuthOptions';

export interface IAuthResolver {
  getAuthHeaders: (authOptions: IAuthOptions) => Promise<IAuthResponse>;
}
