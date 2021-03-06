import {ErrorWithCode, StatusCodeError} from './errors';
import {fetch} from 'whatwg-fetch';
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only';
import getLogger from "./getLogger";
import base64ToArrayBuffer from "./base64ToArrayBuffer";

const deserializeError = require('deserialize-error');
const contentType = require('content-type');

const logger = getLogger('exKitRequest');

/***
 * @typedef {{}} ExKitRequestOptions
 * @property {string} method
 * @property {string} url
 * @property {[string,string][]|{}<string,string>} headers
 * @property {string} charset
 * @property {string} body
 */

/**
 * @param tracker
 * @param {ExKitRequestOptions} options
 * @return {Promise}
 */
const exKitRequest = (tracker, options) => {
  if (typeof options !== 'object') {
    throw new ErrorWithCode('Options is not set', 'OPTIONS_IS_EMPTY');
  }

  const {url, charset, originUrl, ...fetchOptions} = options;

  if (typeof url !== 'string') {
    throw new ErrorWithCode('Incorrect request, url is not string', 'INCORRECT_REQUEST');
  }

  const {origin} = new URL(url);
  if (!tracker.connectRe || !tracker.connectRe.test(origin)) {
    throw new ErrorWithCode(`Connection is not allowed! ${origin} Add url patter in @connect!`, 'ORIGIN_IS_NOT_AVAILABLE');
  }

  let request = null;
  if (tracker.profileOptions.enableProxy) {
    request = tabFetchRequest(originUrl || origin, url, fetchOptions);
  } else {
    request = fetchRequest(url, fetchOptions);
  }

  tracker.requests.push(request);

  return request.then(({response, arrayBuffer}) => {
    let responseCharset = null;
    if (response.headers.has('Content-Type')) {
      try {
        const obj = contentType.parse(response.headers.get('Content-Type'));
        responseCharset = obj.parameters.charset;
      } catch (err) {
        logger.warn('contentType.parse error', err);
      }
    }

    const decoder = new TextDecoder(charset || responseCharset || 'utf-8');
    const body = decoder.decode(arrayBuffer);

    return {
      url: response.url,
      statusCode: response.status,
      statusText: response.statusText,
      body,
      headers: Array.from(response.headers.entries()).reduce((result, [key, value]) => {
        result[key] = value;
        return result;
      }, {}),
    };
  }).then(result => {
    tracker.requests.splice(tracker.requests.indexOf(request), 1);
    return result;
  }, err => {
    tracker.requests.splice(tracker.requests.indexOf(request), 1);
    throw err;
  });
};

const tabFetchRequest = (origin, url, fetchOptions) => {
  let aborted = false;

  const deserializeResult = (result) => {
    if (result.error) {
      throw deserializeError(result.error);
    } else {
      return result.result;
    }
  };

  const request = new Promise((resolve) => {
    const params = {
      origin: origin,
      fetchUrl: url,
      fetchOptions: {
        method: fetchOptions.method,
        headers: fetchOptions.headers,
        body: fetchOptions.body,
      },
    };
    logger.debug('request', params.fetchUrl, params);
    chrome.runtime.sendMessage(Object.assign({
      action: 'search',
    }, params), resolve);
  }).then(deserializeResult).then((id) => {
    request.id = id;
    if (aborted) {
      request.abort();
    }
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'initSearch',
        id: request.id,
      }, resolve);
    }).then(deserializeResult).then(({response, base64}) => {
      const arrayBuffer = base64ToArrayBuffer(base64);

      response.headers = new Headers(response.headers);

      return {response, arrayBuffer};
    });
  });

  request.abort = () => {
    aborted = true;
    chrome.runtime.sendMessage({
      action: 'abortSearch',
      id: request.id,
    });
  };

  return request;
};

const fetchRequest = (url, fetchOptions) => {
  const controller = new AbortController();

  const request = fetch(url, {
    method: fetchOptions.method,
    headers: fetchOptions.headers,
    body: fetchOptions.body,
    signal: controller.signal
  }).then(response => {
    if (!response.ok) {
      throw new StatusCodeError(response.status, null, null, response);
    }

    return response.arrayBuffer().then(arrayBuffer => {
      return {response, arrayBuffer};
    });
  });

  request.abort = () => {
    controller.abort();
  };

  return request;
};

export default exKitRequest;