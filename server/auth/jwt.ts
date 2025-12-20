import { SignJWT, jwtVerify, importSPKI, importPKCS8 } from 'jose';

// JWT Configuration
const JWT_ALGORITHM = 'RS256';
const ACCESS_TOKEN_EXPIRATION = '8h'; // 8 hours for web access
const DEVICE_TOKEN_EXPIRATION = '87600h'; // 10 years for device tokens

interface TokenPayload {
  userId: string;
  companyId: string | null;
  isSuperuser: boolean;
  customerAdminAccess?: boolean;
  isDeviceToken?: boolean;
  locationId?: string | null;
}

export interface VerifiedToken {
  userId: string;
  companyId: string | null; // null for superusers
  isSuperuser: boolean;
  customerAdminAccess: boolean;
  isDeviceToken: boolean;
  locationId: string | null;
}

let privateKey: CryptoKey | null = null;
let publicKey: CryptoKey | null = null;

async function getPrivateKey(): Promise<CryptoKey> {
  if (privateKey) return privateKey;
  
  const keyString = process.env.JWT_PRIVATE_KEY;
  if (!keyString) {
    throw new Error('JWT_PRIVATE_KEY environment variable is not set');
  }
  
  privateKey = await importPKCS8(keyString, JWT_ALGORITHM);
  return privateKey;
}

async function getPublicKey(): Promise<CryptoKey> {
  if (publicKey) return publicKey;
  
  const keyString = process.env.JWT_PUBLIC_KEY;
  if (!keyString) {
    throw new Error('JWT_PUBLIC_KEY environment variable is not set');
  }
  
  publicKey = await importSPKI(keyString, JWT_ALGORITHM);
  return publicKey;
}

function getIssuer(): string {
  return process.env.JWT_ISSUER || 'inspection-brick';
}

function getAudience(): string {
  return process.env.JWT_AUDIENCE || 'inspection-brick-api';
}

/**
 * Generate a standard access token (8 hours)
 */
export async function generateAccessToken(payload: TokenPayload): Promise<string> {
  console.log(`🔐 [JWT] Generating access token for user: ${payload.userId}, company: ${payload.companyId || 'SUPERUSER'}`);
  
  const key = await getPrivateKey();
  const issuer = getIssuer();
  const audience = getAudience();
  
  const token = await new SignJWT({
    userId: payload.userId,
    companyId: payload.companyId,
    isSuperuser: payload.isSuperuser,
    customerAdminAccess: payload.customerAdminAccess || false,
    isDeviceToken: false,
    locationId: payload.locationId || null,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .setSubject(payload.userId)
    .sign(key);
  
  console.log(`✅ [JWT] Access token generated successfully (expires in ${ACCESS_TOKEN_EXPIRATION})`);
  return token;
}

/**
 * Generate a perpetual device token (10 years) for mobile devices
 */
export async function generateDeviceToken(payload: TokenPayload): Promise<string> {
  console.log(`📱 [JWT] Generating device token for company: ${payload.companyId}`);
  
  const key = await getPrivateKey();
  const issuer = getIssuer();
  const audience = getAudience();
  
  const token = await new SignJWT({
    userId: payload.userId,
    companyId: payload.companyId,
    isSuperuser: false, // Device tokens cannot be superuser
    isDeviceToken: true,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setIssuer(issuer)
    .setAudience(audience)
    .setExpirationTime(DEVICE_TOKEN_EXPIRATION)
    .setSubject(payload.userId)
    .sign(key);
  
  console.log(`✅ [JWT] Device token generated successfully (expires in ${DEVICE_TOKEN_EXPIRATION})`);
  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<VerifiedToken> {
  try {
    const key = await getPublicKey();
    const issuer = getIssuer();
    const audience = getAudience();
    
    const { payload } = await jwtVerify(token, key, {
      issuer,
      audience,
    });
    
    const userId = payload.userId as string;
    const companyId = payload.companyId as string | null;
    const isSuperuser = payload.isSuperuser as boolean;
    const customerAdminAccess = payload.customerAdminAccess as boolean || false;
    const isDeviceToken = payload.isDeviceToken as boolean || false;
    const locationId = payload.locationId as string | null || null;
    
    if (!userId) {
      throw new Error('Token missing userId claim');
    }
    
    console.log(`✅ [JWT] Token verified - user: ${userId}, company: ${companyId || 'SUPERUSER'}, device: ${isDeviceToken}`);
    
    return {
      userId,
      companyId: isSuperuser ? null : companyId,
      isSuperuser,
      customerAdminAccess,
      isDeviceToken,
      locationId,
    };
  } catch (error) {
    console.error('❌ [JWT] Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}
