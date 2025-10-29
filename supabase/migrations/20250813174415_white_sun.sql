-- =============================================
-- Script: Creación de tabla POLIZAS
-- Base de datos: SQL Server
-- Descripción: Tabla para almacenar información de pólizas de seguros
-- =============================================

USE [SegurosDB] -- Cambiar por el nombre de tu base de datos
GO

-- Crear tabla POLIZAS
CREATE TABLE [dbo].[POLIZAS] (
    -- Clave primaria
    [Id] [int] IDENTITY(1,1) NOT NULL,
    
    -- Código de verificación (único)
    [CodigoVerificacion] [varchar](20) NOT NULL,
    
    -- Información del tomador
    [NombreTomador] [nvarchar](200) NOT NULL,
    
    -- Información del asegurado
    [NombreAsegurado] [nvarchar](200) NOT NULL,
    
    -- Número de póliza
    [NumeroPoliza] [varchar](50) NOT NULL,
    
    -- Fechas de vigencia
    [FechaInicioVigencia] [date] NOT NULL,
    [FechaFinVigencia] [date] NOT NULL,
    
    -- Estado de la póliza
    [Estado] [varchar](20) NOT NULL DEFAULT 'ACTIVA',
    
    -- Campos de auditoría
    [FechaCreacion] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [FechaModificacion] [datetime2](7) NULL,
    [UsuarioCreacion] [varchar](100) NOT NULL DEFAULT SYSTEM_USER,
    [UsuarioModificacion] [varchar](100) NULL,
    
    -- Campos adicionales opcionales
    [TipoPoliza] [varchar](50) NULL,
    [CompaniaAseguradora] [varchar](100) NOT NULL DEFAULT 'SURA',
    [MontoAsegurado] [decimal](18,2) NULL,
    [Prima] [decimal](18,2) NULL,
    [Observaciones] [nvarchar](500) NULL,
    [Activo] [bit] NOT NULL DEFAULT 1,
    
    -- Definir clave primaria
    CONSTRAINT [PK_POLIZAS] PRIMARY KEY CLUSTERED ([Id] ASC),
    
    -- Definir índices únicos
    CONSTRAINT [UK_POLIZAS_CodigoVerificacion] UNIQUE ([CodigoVerificacion]),
    CONSTRAINT [UK_POLIZAS_NumeroPoliza] UNIQUE ([NumeroPoliza]),
    
    -- Definir restricciones de validación
    CONSTRAINT [CK_POLIZAS_Estado] CHECK ([Estado] IN ('ACTIVA', 'VENCIDA', 'CANCELADA', 'SUSPENDIDA')),
    CONSTRAINT [CK_POLIZAS_FechaVigencia] CHECK ([FechaFinVigencia] > [FechaInicioVigencia]),
    CONSTRAINT [CK_POLIZAS_MontoAsegurado] CHECK ([MontoAsegurado] >= 0),
    CONSTRAINT [CK_POLIZAS_Prima] CHECK ([Prima] >= 0)
)
GO

-- Crear índices para optimizar consultas
CREATE NONCLUSTERED INDEX [IX_POLIZAS_FechaVigencia] 
ON [dbo].[POLIZAS] ([FechaInicioVigencia], [FechaFinVigencia])
GO

CREATE NONCLUSTERED INDEX [IX_POLIZAS_NombreTomador] 
ON [dbo].[POLIZAS] ([NombreTomador])
GO

CREATE NONCLUSTERED INDEX [IX_POLIZAS_NombreAsegurado] 
ON [dbo].[POLIZAS] ([NombreAsegurado])
GO

CREATE NONCLUSTERED INDEX [IX_POLIZAS_Estado_Activo] 
ON [dbo].[POLIZAS] ([Estado], [Activo])
GO

-- Crear trigger para actualizar fecha de modificación
CREATE TRIGGER [dbo].[TR_POLIZAS_UpdateModification]
ON [dbo].[POLIZAS]
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    
    UPDATE [dbo].[POLIZAS]
    SET 
        [FechaModificacion] = GETDATE(),
        [UsuarioModificacion] = SYSTEM_USER
    FROM [dbo].[POLIZAS] p
    INNER JOIN inserted i ON p.[Id] = i.[Id]
END
GO

-- Insertar datos de ejemplo
INSERT INTO [dbo].[POLIZAS] (
    [CodigoVerificacion],
    [NombreTomador],
    [NombreAsegurado],
    [NumeroPoliza],
    [FechaInicioVigencia],
    [FechaFinVigencia],
    [Estado],
    [TipoPoliza],
    [MontoAsegurado],
    [Prima]
) VALUES 
('ACT001', 'Ana Patricia Vásquez Herrera', 'Ana Patricia Vásquez Herrera', 'SUR-2024-012345', '2024-11-01', '2025-11-01', 'ACTIVA', 'VIDA', 100000.00, 1200.00),
('POL001', 'María González Rodríguez', 'María González Rodríguez', 'SUR-2024-001234', '2024-01-15', '2025-01-15', 'ACTIVA', 'AUTO', 50000.00, 800.00),
('POL002', 'Carlos Martínez López', 'Ana Martínez Pérez', 'SUR-2023-005678', '2023-12-01', '2024-12-01', 'VENCIDA', 'HOGAR', 75000.00, 600.00),
('VER123', 'Laura Fernández Silva', 'Laura Fernández Silva', 'SUR-2024-009876', '2024-03-10', '2025-03-10', 'ACTIVA', 'SALUD', 200000.00, 2400.00),
('TEST456', 'Roberto Díaz Morales', 'Carmen Díaz Torres', 'SUR-2024-004321', '2024-02-20', '2025-02-20', 'ACTIVA', 'VIDA', 150000.00, 1800.00);
GO

-- Crear vista para consultas frecuentes
CREATE VIEW [dbo].[VW_POLIZAS_VIGENTES] AS
SELECT 
    [CodigoVerificacion],
    [NombreTomador],
    [NombreAsegurado],
    [NumeroPoliza],
    [FechaInicioVigencia],
    [FechaFinVigencia],
    [Estado],
    [TipoPoliza],
    [MontoAsegurado],
    [Prima],
    CASE 
        WHEN GETDATE() BETWEEN [FechaInicioVigencia] AND [FechaFinVigencia] 
        THEN 'VIGENTE' 
        ELSE 'NO_VIGENTE' 
    END AS [EstadoVigencia],
    DATEDIFF(DAY, GETDATE(), [FechaFinVigencia]) AS [DiasParaVencimiento]
FROM [dbo].[POLIZAS]
WHERE [Activo] = 1
GO

-- Crear procedimiento almacenado para consulta por código
CREATE PROCEDURE [dbo].[SP_ConsultarPolizaPorCodigo]
    @CodigoVerificacion VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        [CodigoVerificacion],
        [NombreTomador],
        [NombreAsegurado],
        [NumeroPoliza],
        [FechaInicioVigencia],
        [FechaFinVigencia],
        [Estado],
        [TipoPoliza],
        [MontoAsegurado],
        [Prima],
        CASE 
            WHEN GETDATE() BETWEEN [FechaInicioVigencia] AND [FechaFinVigencia] 
            THEN 'VIGENTE' 
            ELSE 'NO_VIGENTE' 
        END AS [EstadoVigencia]
    FROM [dbo].[POLIZAS]
    WHERE [CodigoVerificacion] = @CodigoVerificacion
      AND [Activo] = 1;
END
GO

-- Ejemplo de uso del procedimiento almacenado
-- EXEC [dbo].[SP_ConsultarPolizaPorCodigo] 'ACT001'

PRINT 'Tabla POLIZAS creada exitosamente con datos de ejemplo'
GO