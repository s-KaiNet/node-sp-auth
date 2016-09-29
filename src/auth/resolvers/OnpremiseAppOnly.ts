import * as Promise from 'bluebird';

import { IAuthResolver } from './../IAuthResolver';
import { IAppOnlyOnPremise } from './../IAuthOptions';
import {IAuthResponse} from './../IAuthResponse';

export class OnpremiseAppOnly implements IAuthResolver {
  public getAuthHeaders(authOptions: IAppOnlyOnPremise): Promise<IAuthResponse> {
    return new Promise<IAuthResponse>((resolve, reject) => {
      /* TODO */
    });
  };
}
