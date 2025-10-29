import { ApiResponse, PolicyData } from '../types/policy';

// Mock data para simular la API
const mockPolicies: PolicyData[] = [
  {
    id: "ACT001",
    tomador: "Ana Patricia Vásquez Herrera",
    asegurado: "Ana Patricia Vásquez Herrera",
    vigencia: {
      inicio: "2024-11-01",
      fin: "2025-11-01"
    }
  },
  {
    id: "POL001",
    tomador: "María González Rodríguez",
    asegurado: "María González Rodríguez",
    vigencia: {
      inicio: "2024-01-15",
      fin: "2025-01-15"
    }
  },
  {
    id: "POL002", 
    tomador: "Carlos Martínez López",
    asegurado: "Ana Martínez Pérez",
    vigencia: {
      inicio: "2023-12-01",
      fin: "2024-12-01"
    }
  },
  {
    id: "VER123",
    tomador: "Laura Fernández Silva",
    asegurado: "Laura Fernández Silva",
    vigencia: {
      inicio: "2024-03-10",
      fin: "2025-03-10"
    }
  },
  {
    id: "TEST456",
    tomador: "Roberto Díaz Morales",
    asegurado: "Carmen Díaz Torres",
    vigencia: {
      inicio: "2024-02-20",
      fin: "2025-02-20"
    }
  }
];

export const verifyPolicyCode = async (code: string): Promise<ApiResponse> => {
  // Simular latencia de API
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const policy = mockPolicies.find(p => p.id === code.toUpperCase());
  
  if (policy) {
    return {
      success: true,
      data: policy
    };
  } else {
    return {
      success: false,
      message: "Código de verificación no encontrado. Verifique que el código sea correcto."
    };
  }
};