export const template = `
  <t:RequestSecurityTokenResponse xmlns:t="http://schemas.xmlsoap.org/ws/2005/02/trust">
    <t:Lifetime>
      <wsu:Created xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><%= created %></wsu:Created>
      <wsu:Expires xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd"><%= expires %></wsu:Expires>
    </t:Lifetime>
    <wsp:AppliesTo xmlns:wsp="http://schemas.xmlsoap.org/ws/2004/09/policy">
      <wsa:EndpointReference xmlns:wsa="http://www.w3.org/2005/08/addressing">
        <wsa:Address><%= relyingParty %></wsa:Address>
      </wsa:EndpointReference>
    </wsp:AppliesTo>
    <t:RequestedSecurityToken><%= token %></t:RequestedSecurityToken>
    <t:TokenType>urn:oasis:names:tc:SAML:1.0:assertion</t:TokenType>
    <t:RequestType>http://schemas.xmlsoap.org/ws/2005/02/trust/Issue</t:RequestType>
    <t:KeyType>http://schemas.xmlsoap.org/ws/2005/05/identity/NoProofKey</t:KeyType>
  </t:RequestSecurityTokenResponse>
`;
