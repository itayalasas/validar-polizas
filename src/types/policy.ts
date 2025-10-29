export interface PolicyData {
  id: string;
  tomador: string;
  asegurado: string;
  vigencia: {
    inicio: string;
    fin: string;
  };
}

export interface ApiResponse {
  success: boolean;
  data?: PolicyData;
  message?: string;
}