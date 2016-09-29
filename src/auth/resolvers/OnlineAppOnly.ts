import * as Promise from 'bluebird';

import { IAuthResolver } from './../IAuthResolver';
import { IAppOnlyOnline } from './../IAuthOptions';
import {IAuthResponse} from './../IAuthResponse';

export class OnlineAppOnly implements IAuthResolver {
  public getAuthHeaders(authOptions: IAppOnlyOnline): Promise<IAuthResponse> {
    return new Promise<IAuthResponse>((resolve, reject) => {
      /* TODO */
    });
  };
}
