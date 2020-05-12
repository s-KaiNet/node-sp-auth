import { IAuthResolver } from '../../IAuthResolver';
import { IAuthResponse } from '../../IAuthResponse';
import { HostingEnvironment } from '../../HostingEnvironment';
import { UrlHelper } from '../../../utils/UrlHelper';

export abstract class OnlineResolver implements IAuthResolver {

  protected hostingEnvironment: HostingEnvironment;
  protected endpointsMappings: Map<HostingEnvironment, string>;

  constructor(protected _siteUrl: string) {
    this.endpointsMappings = new Map();
    this.hostingEnvironment = UrlHelper.ResolveHostingEnvironment(this._siteUrl);
    this.InitEndpointsMappings();
  }

  public abstract getAuth(): Promise<IAuthResponse>;
  protected abstract InitEndpointsMappings(): void;
}
