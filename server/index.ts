import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import https from 'https';
import http from 'http';

dotenv.config();

const app = express();
const PORT = 3001;
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas solicitudes desde esta IP, por favor intente más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ApiPolicyResponse {
  id: number;
  codigoVerificacion: string;
  nombreTomador: string;
  nombreAsegurado: string;
  fechaInicioVigencia: string;
  fechaFinVigencia: string;
  fechaCreacion: string;
  estadoVigencia: string;
}

let cachedToken: string | null = null;
let tokenExpiration: number = 0;

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && Date.now() < tokenExpiration) {
    return cachedToken;
  }

  const tokenUrl = process.env.VITE_AUTH_TOKEN_URL;
  const clientId = process.env.VITE_CLIENT_ID;
  const clientSecret = process.env.VITE_CLIENT_SECRET;
  const grantType = process.env.VITE_GRANT_TYPE || 'client_credentials';
  const scope = process.env.VITE_SCOPE;

  if (!tokenUrl || !clientId || !clientSecret || !scope) {
    throw new Error('Missing required environment variables for authentication');
  }

  if (!isProduction) {
    console.log('=== Token Request Debug ===');
    console.log('URL:', tokenUrl);
    console.log('client_id:', clientId);
    console.log('grant_type:', grantType);
    console.log('scope:', scope);
  }

  console.log('🔐 [AUTH] Iniciando solicitud de token...');
  console.log('🔐 [AUTH] URL:', tokenUrl);
  console.log('🔐 [AUTH] Client ID:', clientId);
  console.log('🔐 [AUTH] Grant Type:', grantType);
  console.log('🔐 [AUTH] Scope:', scope);
  console.log('🔐 [AUTH] Client Secret presente:', clientSecret ? 'SÍ (longitud: ' + clientSecret.length + ')' : 'NO');
  console.log('🔐 [AUTH] Client Secret (primeros 10 chars):', clientSecret?.substring(0, 10) + '...');

  const bodyParts = [
    `client_id=${clientId}`,
    `client_secret=${clientSecret}`,
    `grant_type=${grantType}`,
    `scope=${encodeURIComponent(scope)}`
  ];
  const body = bodyParts.join('&');

  try {
    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });

    console.log('🔐 [AUTH] Enviando petición POST a Microsoft Azure AD...');
    console.log('🔐 [AUTH] Body params (secret oculto):', body.replace(clientSecret || '', '***SECRET***'));

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body,
      // @ts-ignore
      agent: (_parsedURL: URL) => {
        if (_parsedURL.protocol === 'http:') {
          return httpAgent;
        } else {
          return httpsAgent;
        }
      }
    });

    console.log('🔐 [AUTH] Respuesta recibida - Status:', response.status);
    console.log('🔐 [AUTH] Response OK:', response.ok);
    console.log('🔐 [AUTH] Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [AUTH] Token response error:', response.status, errorText);
      throw new Error('Error al obtener el token de autenticación');
    }

    const data: TokenResponse = await response.json();
    console.log('✅ [AUTH] Token obtenido exitosamente');
    console.log('✅ [AUTH] Token type:', data.token_type);
    console.log('✅ [AUTH] Expires in:', data.expires_in, 'segundos');
    console.log('✅ [AUTH] Token (primeros 20 chars):', data.access_token.substring(0, 20) + '...');

    cachedToken = data.access_token;
    tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000;

    return data.access_token;
  } catch (error) {
    console.error('❌ [AUTH] Error obteniendo token:', error);
    console.error('❌ [AUTH] Error name:', error instanceof Error ? error.name : 'unknown');
    console.error('❌ [AUTH] Error message:', error instanceof Error ? error.message : 'unknown');
    console.error('❌ [AUTH] Error stack:', error instanceof Error ? error.stack : 'unknown');

    if (error && typeof error === 'object' && 'cause' in error) {
      console.error('❌ [AUTH] Error cause:', error.cause);
    }

    throw new Error('No se pudo autenticar con el servicio');
  }
};

app.post('/api/verify-policy', async (req: Request, res: Response) => {
  try {
    console.log('📋 [VERIFY] Nueva solicitud de verificación de póliza');
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      console.log('❌ [VERIFY] Código de verificación no proporcionado');
      return res.status(400).json({
        success: false,
        message: 'Código de verificación requerido',
      });
    }

    const cleanCode = code.trim();
    const codeWithoutSpaces = cleanCode.replace(/\s/g, '');

    console.log('📋 [VERIFY] Código recibido (oculto):', code.replace(/\d/g, '*'));
    console.log('📋 [VERIFY] Código limpio (sin espacios, oculto):', codeWithoutSpaces.replace(/\d/g, '*'));
    console.log('📋 [VERIFY] Longitud del código:', codeWithoutSpaces.length);

    if (!/^\d{12}$/.test(codeWithoutSpaces)) {
      console.log('❌ [VERIFY] Código inválido - No tiene 12 dígitos');
      return res.status(400).json({
        success: false,
        message: 'El código debe contener exactamente 12 dígitos',
      });
    }

    console.log('📋 [VERIFY] Código válido, obteniendo token de acceso...');
    const token = await getAccessToken();
    console.log('✅ [VERIFY] Token obtenido, procediendo a verificar póliza');
    const apiBaseUrl = process.env.VITE_API_BASE_URL;

    if (!apiBaseUrl) {
      console.error('❌ [VERIFY] API base URL no configurada');
      throw new Error('API base URL not configured');
    }

    const codigoWithQuotes = `"${cleanCode}"`;
    const encodedCodigo = encodeURIComponent(codigoWithQuotes);
    const url = `${apiBaseUrl}?codigo=${encodedCodigo}`;

    console.log('🌐 [VERIFY] API Base URL:', apiBaseUrl);
    console.log('🌐 [VERIFY] URL completa (código oculto):', url.replace(/codigo=.*/, 'codigo=***'));
    console.log('🌐 [VERIFY] Enviando petición GET a API de Sura...');

    const httpAgent = new http.Agent({ keepAlive: true });
    const httpsAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // @ts-ignore
      agent: (_parsedURL: URL) => {
        if (_parsedURL.protocol === 'http:') {
          return httpAgent;
        } else {
          return httpsAgent;
        }
      }
    });

    console.log('🌐 [VERIFY] Respuesta de API Sura - Status:', response.status);
    console.log('🌐 [VERIFY] Response OK:', response.ok);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('❌ [VERIFY] Póliza no encontrada (404)');
        return res.status(404).json({
          success: false,
          message: 'Código de verificación no encontrado. Verifique que el código sea correcto.',
        });
      }
      const errorText = await response.text();
      console.error('❌ [VERIFY] API response error:', response.status, errorText);
      throw new Error('Error al verificar la póliza');
    }

    const policyData: ApiPolicyResponse = await response.json();
    console.log('✅ [VERIFY] Póliza encontrada exitosamente');
    console.log('✅ [VERIFY] Nombre tomador:', policyData.nombreTomador);
    console.log('✅ [VERIFY] Estado vigencia:', policyData.estadoVigencia);

    return res.status(200).json({
      success: true,
      data: policyData,
    });
  } catch (error) {
    console.error('❌ [VERIFY] Error verificando póliza:', error);
    console.error('❌ [VERIFY] Error stack:', error instanceof Error ? error.stack : 'unknown');
    return res.status(500).json({
      success: false,
      message: error instanceof Error
        ? error.message
        : 'Error al verificar la póliza. Inténtelo nuevamente.',
    });
  }
});

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log('='.repeat(60));
  console.log('📍 Environment Variables Status:');
  console.log('   - VITE_AUTH_TOKEN_URL:', process.env.VITE_AUTH_TOKEN_URL ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_CLIENT_ID:', process.env.VITE_CLIENT_ID ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_CLIENT_SECRET:', process.env.VITE_CLIENT_SECRET ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_GRANT_TYPE:', process.env.VITE_GRANT_TYPE ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_SCOPE:', process.env.VITE_SCOPE ? '✅ Configurado' : '❌ NO configurado');
  console.log('   - VITE_API_BASE_URL:', process.env.VITE_API_BASE_URL ? '✅ Configurado' : '❌ NO configurado');
  console.log('='.repeat(60));
});
