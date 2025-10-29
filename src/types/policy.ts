export interface ApiPolicyResponse {
  id: number;
  codigoVerificacion: string;
  nombreTomador: string;
  nombreAsegurado: string;
  fechaInicioVigencia: string;
  fechaFinVigencia: string;
  fechaCreacion: string;
  estadoVigencia: string;
}

export interface PolicyData {
  id: string;
  tomador: string;
  asegurado: string;
  vigencia: {
    inicio: string;
    fin: string;
  };
  estadoVigencia: string;
}

export interface ApiResponse {
  success: boolean;
  data?: PolicyData;
  message?: string;
}