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

let cachedToken: string | null = null;
let tokenExpiration: number = 0;

const getAccessToken = async (): Promise<string> => {
  if (cachedToken && Date.now() < tokenExpiration) {
    return cachedToken;
  }

  const tokenUrl = "https://login.microsoftonline.com/3c0bd4fe-1111-4d13-8e0c-7c33b9eb7581/oauth2/v2.0/token";
  const clientId = "1fc6ca42-b37d-457b-a0d9-e0b5bf416f98";
  const clientSecret = "k158Q~6AjT.p9gXhYzryGYkL-0XSCloRYSFcobIO";
  const grantType = "client_credentials";
  const scope = "api://1fc6ca42-b37d-457b-a0d9-e0b5bf416f98/.default";

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

    if (!code) {
      return new Response(
        JSON.stringify({ error: "Código de verificación requerido" }),
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
    const apiBaseUrl = "https://sura-portales-xapi-4o6opf.u1lglj.bra-s1.cloudhub.io/api/portales/valida-poliza";
    const url = `${apiBaseUrl}/polizas?codigo="${code}"`;

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
      throw new Error("Error al verificar la póliza");
    }

    const policyData = await apiResponse.json();

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
