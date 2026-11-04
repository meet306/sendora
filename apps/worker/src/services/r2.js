// Cloudflare R2 & S3-compatible SigV4 Presigning Service
// 100% pure ES modules using Web Crypto API

/**
 * Convert string to ArrayBuffer via UTF-8
 * @param {string} str
 * @returns {Uint8Array}
 */
function toUtf8(str) {
  return new TextEncoder().encode(str);
}

/**
 * Convert ArrayBuffer to Hex String
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * HMAC-SHA256 calculation
 * @param {Uint8Array|ArrayBuffer} key
 * @param {string} data
 * @returns {Promise<ArrayBuffer>}
 */
async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, toUtf8(data));
}

/**
 * SHA-256 calculation
 * @param {string} data
 * @returns {Promise<string>}
 */
async function sha256Hex(data) {
  const hash = await crypto.subtle.digest('SHA-256', toUtf8(data));
  return toHex(hash);
}

/**
 * Generate AWS Signature V4 Presigned URL for Cloudflare R2
 * Compatible with R2's S3 API: https://<account_id>.r2.cloudflarestorage.com/<bucket>/<key>
 *
 * @param {object} params
 * @param {string} params.accountId
 * @param {string} params.accessKeyId
 * @param {string} params.secretAccessKey
 * @param {string} params.bucketName
 * @param {string} params.key
 * @param {string} params.method - 'GET' | 'PUT'
 * @param {number} [params.expiresIn=300] - Seconds until URL expires (default 5 minutes)
 * @param {object} [params.queryParams={}] - e.g. { partNumber: '1', uploadId: 'xyz' }
 * @param {object} [params.headers={}]
 * @returns {Promise<string>}
 */
export async function getPresignedR2Url({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucketName,
  key,
  method = 'GET',
  expiresIn = 300,
  queryParams = {},
  headers = {}
}) {
  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error('Missing required R2 credentials for SigV4 presigning');
  }

  const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
  const region = 'auto';
  const service = 's3';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const canonicalHeadersMap = {
    host,
    ...headers
  };

  const signedHeaders = Object.keys(canonicalHeadersMap)
    .map(k => k.toLowerCase())
    .sort()
    .join(';');

  const canonicalHeaders = Object.keys(canonicalHeadersMap)
    .map(k => k.toLowerCase())
    .sort()
    .map(k => `${k}:${canonicalHeadersMap[k].trim()}\n`)
    .join('');

  // Assemble query parameters
  const allQueryParams = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': expiresIn.toString(),
    'X-Amz-SignedHeaders': signedHeaders,
    ...queryParams
  };

  const canonicalQueryString = Object.keys(allQueryParams)
    .sort()
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(allQueryParams[k])}`)
    .join('&');

  const encodedPath = `/${encodeURIComponent(bucketName)}/${key.split('/').map(encodeURIComponent).join('/')}`;

  const payloadHash = 'UNSIGNED-PAYLOAD';

  const canonicalRequest = [
    method.toUpperCase(),
    encodedPath,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    await sha256Hex(canonicalRequest)
  ].join('\n');

  // Derive signing key
  const kDate = await hmacSha256(toUtf8(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');

  const signature = toHex(await hmacSha256(kSigning, stringToSign));

  return `${endpoint}${encodedPath}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

/**
 * Check if direct S3/R2 presigned credentials are fully configured
 * @param {object} env
 * @returns {boolean}
 */
export function hasDirectR2Credentials(env) {
  return Boolean(
    env.R2_ACCOUNT_ID &&
    env.R2_ACCESS_KEY_ID &&
    env.R2_SECRET_ACCESS_KEY &&
    env.R2_BUCKET_NAME
  );
}
