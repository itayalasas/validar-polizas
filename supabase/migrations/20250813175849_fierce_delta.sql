-- =============================================
-- Script: Creación de tabla VALIDA_POLIZA
-- Base de datos: SQL Server
-- Descripción: Tabla simplificada para validación de pólizas de seguros
-- =============================================

USE [SegurosDB] -- Cambiar por el nombre de tu base de datos
GO

-- Crear tabla VALIDA_POLIZA
CREATE TABLE [dbo].[VALIDA_POLIZA] (
    -- Clave primaria
    [Id] [int] IDENTITY(1,1) NOT NULL,
    
    -- Código de verificación (único)
    [CodigoVerificacion] [varchar](20) NOT NULL,
    
    -- Información del tomador
    [NombreTomador] [nvarchar](200) NOT NULL,
    
    -- Información del asegurado
    [NombreAsegurado] [nvarchar](200) NOT NULL,
    
    -- Fechas de vigencia
    [FechaInicioVigencia] [date] NOT NULL,
    [FechaFinVigencia] [date] NOT NULL,
    
    -- Campo de auditoría
    [FechaCreacion] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    -- Definir clave primaria
    CONSTRAINT [PK_VALIDA_POLIZA] PRIMARY KEY CLUSTERED ([Id] ASC),
    
    -- Definir índice único para código de verificación
    CONSTRAINT [UK_VALIDA_POLIZA_CodigoVerificacion] UNIQUE ([CodigoVerificacion]),
    
    -- Definir restricción de validación para fechas
    CONSTRAINT [CK_VALIDA_POLIZA_FechaVigencia] CHECK ([FechaFinVigencia] > [FechaInicioVigencia])
)
GO

-- Crear índices para optimizar consultas
CREATE NONCLUSTERED INDEX [IX_VALIDA_POLIZA_CodigoVerificacion] 
ON [dbo].[VALIDA_POLIZA] ([CodigoVerificacion])
GO

CREATE NONCLUSTERED INDEX [IX_VALIDA_POLIZA_FechaVigencia] 
ON [dbo].[VALIDA_POLIZA] ([FechaInicioVigencia], [FechaFinVigencia])
GO

-- Insertar datos de ejemplo
INSERT INTO [dbo].[VALIDA_POLIZA] (
    [CodigoVerificacion],
    [NombreTomador],
    [NombreAsegurado],
    [FechaInicioVigencia],
    [FechaFinVigencia]
) VALUES 
('ACT001', 'Ana Patricia Vásquez Herrera', 'Ana Patricia Vásquez Herrera', '2024-11-01', '2025-11-01'),
('POL001', 'María González Rodríguez', 'María González Rodríguez', '2024-01-15', '2025-01-15'),
('POL002', 'Carlos Martínez López', 'Ana Martínez Pérez', '2023-12-01', '2024-12-01'),
('VER123', 'Laura Fernández Silva', 'Laura Fernández Silva', '2024-03-10', '2025-03-10'),
('TEST456', 'Roberto Díaz Morales', 'Carmen Díaz Torres', '2024-02-20', '2025-02-20');
GO

-- Crear procedimiento almacenado para consulta por código
CREATE PROCEDURE [dbo].[SP_ConsultarValidaPoliza]
    @CodigoVerificacion VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        [Id],
        [CodigoVerificacion],
        [NombreTomador],
        [NombreAsegurado],
        [FechaInicioVigencia],
        [FechaFinVigencia],
        [FechaCreacion],
        CASE 
            WHEN GETDATE() BETWEEN [FechaInicioVigencia] AND [FechaFinVigencia] 
            THEN 'VIGENTE' 
            ELSE 'VENCIDA' 
        END AS [EstadoVigencia]
    FROM [dbo].[VALIDA_POLIZA]
    WHERE [CodigoVerificacion] = @CodigoVerificacion;
END
GO

-- Ejemplo de uso del procedimiento almacenado
-- EXEC [dbo].[SP_ConsultarValidaPoliza] 'ACT001'

PRINT 'Tabla VALIDA_POLIZA creada exitosamente con datos de ejemplo'
GO