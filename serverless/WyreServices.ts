import axios, { AxiosResponse } from 'axios';
import { HmacSHA256 } from 'crypto-js';

const API_KEY = '';
const API_SECRET = ''

export class WyreServices {
  axios;
  constructor() {
  }
  getAccount(mainAccount: string, masquerade: boolean): Promise<AxiosResponse> {
    const endPoint = `/v3/accounts/${mainAccount}`;
    let masqueradeId = masquerade ? mainAccount : null;
    const url = this.generateUrl(endPoint, masqueradeId);
    return this.getRequest(url);
  }

  createAccount(
    parentAccountId: string,
    country: string,
    fullName: string,
    email: string,
    street1: string,
    street2: string,
    city: string,
    state: string,
    postalCode: string,
    ssn: string,
    dob: Date): Promise<AxiosResponse> {
    const endPoint = `/v3/accounts`;
    const url = this.generateUrl(endPoint, null);
    const params = {
      type: 'INDIVIDUAL',
      country: country,
      profileFields: [
        {
          "fieldId": "individualLegalName",
          "value": fullName
        },
        {
          "fieldId": "individualEmail",
          "value": email
        },
        {
          "fieldId": "individualResidenceAddress",
          "value": {
            "street1": street1,
            "street2": street2,
            "city": city,
            "state": state,
            "postalCode": postalCode,
            "country": country,
            "individualSsn": ssn,
            "individualDateOfBirth": dob
          }
        }
      ],
      referrerAccountId: parentAccountId
    }
    return this.postRequest(url, params);
  }

  createTransfer(srn: string,
    sourceCurrencySymbol: string,
    sourceAmt: string,
    destSrn: string,
    destCurrencySymbol: string,
    message: string) {
    const endPoint = `/v3/transfers`;
    const url = this.generateUrl(endPoint, null);
    const params = {
      // "source": "account:AC-WYUR7ZZ6UMU",
      // "sourceCurrency": "USD",
      // "sourceAmount": "5",
      // "dest": "bitcoin:14CriXWTRoJmQdBzdikw6tEmSuwxMozWWq",
      // "destCurrency": "BTC",
      // "message": "Payment for DorianNakamoto@sendwyre.com",
      // "notifyUrl": "An optional url that Wyre will POST a status callback to ",
      // "autoConfirm": true
      "source": srn,
      "sourceCurrency": sourceCurrencySymbol,
      "sourceAmount": sourceAmt,
      "dest": destSrn,
      "destCurrency": destCurrencySymbol,
      "message": message,
      "autoConfirm": true

    }
    return this.postRequest(url, params);
  }

  uploadDocument(accountId: string, document: Object, masquerade: boolean) {
    const endPoint = `/v3/accounts/${accountId}/DOCUMENT`;
    let masqueradeId = masquerade ? accountId : null;
    const url = this.generateUrl(endPoint, masqueradeId);
    const signed = this.signMessage(url, JSON.stringify(document));
    const headers = this.getHeaders(signed);
    headers['Content-Type'] = 'image/jpeg';
    return this.postRequestWithHeaders(url, signed, headers);
  }

  timestampUrl(url: string): string {
    // Additionally, you should include a GET parameter named timestamp which is the current time in millisecond epoch format. We use this timestamp to help protect against replay attacks.
    let token = '?';
    if (url.indexOf('?') !== -1) {
      token = '&';
    }
    return `${url}${token}timestamp=${(new Date).getTime()}`;
  }

  generateUrl(restEndpoint: string, masqueradeId: string): string {
    const baseURL = 'https://api.testwyre.com';
    let url = `${baseURL}${restEndpoint}`;
    if (masqueradeId !== null) {
      url += `?masqueradeAs=${masqueradeId}`;
    }
    // TODO it seems like timestamp isn't included in the URL which is hashed but I can't get it to work either way
    return this.timestampUrl(url);
  }

  getRequest(url: string): Promise<AxiosResponse> {
    const signed = this.signMessage(url, "");
    return new Promise((resolve, reject) => {
      axios.get(url, this.getHeaders(signed)).then((result) => {
        resolve(result);
      }).catch((e) => {
        reject(e);
      });
    });
  }

  postRequest(url: string, params: Object): Promise<AxiosResponse> {
    const signed = this.signMessage(url, JSON.stringify(params));
    const headers = this.getHeaders(signed);
    return this.postRequestWithHeaders(url, params, headers);
  }

  postRequestWithHeaders(url: string, params: Object, headers: Object): Promise<AxiosResponse> {
    return new Promise((resolve, reject) => {
      axios.post(url, params, headers).then((result) => {
        resolve(result);
      }).catch((e) => {
        reject(e);
      });
    });
  }

  getHeaders(signature: string) {
    return {
      headers: {
        'X-Api-Key': API_KEY,
        'X-Api-Signature': signature,
      }
    }
  }

  signMessage(url: string, body: string): string {
    /* Calculating the X-Api-Signature field is a two step process:
    1. Concatenate the request URL with the body of the HTTP request (encoded using UTF8) into a string. Use an empty string for the HTTP body in GET requests
    2. Compute the signature as a HEX encoded HMAC with SHA-256 and your API Secret Key
    Note: You must send the request body exactly as you sign it, whitespace and all. The server calculates the signature based on exactly what's in the request body.
    https://docs.sendwyre.com/docs/authentication#section-calculating-the-request-signature
    */
    const urlEnc = `${url}${body}`;
    return HmacSHA256(urlEnc, API_SECRET).toString();
  }
}