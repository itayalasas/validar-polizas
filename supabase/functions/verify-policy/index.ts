import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

  const tokenUrl = Deno.env.get("VITE_AUTH_TOKEN_URL");
  const clientId = Deno.env.get("VITE_CLIENT_ID");
  const clientSecret = Deno.env.get("VITE_CLIENT_SECRET");
  const grantType = Deno.env.get("VITE_GRANT_TYPE") || "client_credentials";
  const scope = Deno.env.get("VITE_SCOPE");

  if (!tokenUrl || !clientId || !clientSecret || !scope) {
    throw new Error("Missing required environment variables for authentication");
  }

  const params = new URLSearchParams();
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("grant_type", grantType);
  params.append("scope", scope);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error("Error al obtener el token de autenticación");
  }

  const data: TokenResponse = await response.json();
  cachedToken = data.access_token;
  tokenExpiration = Date.now() + (data.expires_in * 1000) - 60000;

  return data.access_token;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Código de verificación requerido",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const cleanCode = code.trim();
    const codeWithoutSpaces = cleanCode.replace(/\s/g, "");

    if (!/^\d{12}$/.test(codeWithoutSpaces)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "El código debe contener exactamente 12 dígitos",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const token = await getAccessToken();
    const apiBaseUrl = Deno.env.get("VITE_API_BASE_URL");

    if (!apiBaseUrl) {
      throw new Error("API base URL not configured");
    }

    const codigoWithQuotes = `"${cleanCode}"`;
    const encodedCodigo = encodeURIComponent(codigoWithQuotes);
    const url = `${apiBaseUrl}?codigo=${encodedCodigo}`;

    const apiResponse = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!apiResponse.ok) {
      if (apiResponse.status === 404) {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Código de verificación no encontrado. Verifique que el código sea correcto.",
          }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
      const errorText = await apiResponse.text();
      console.error("API response error:", apiResponse.status, errorText);
      throw new Error("Error al verificar la póliza");
    }

    const policyData: ApiPolicyResponse = await apiResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        data: policyData,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error en edge function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error
          ? error.message
          : "Error al verificar la póliza. Inténtelo nuevamente.",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});