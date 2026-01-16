# Estrategia de Testing - Módulo de Comparación de Planos

Este documento define la estrategia de pruebas para el módulo "Comparación de Planos", asegurando su validación de forma aislada y segura antes de la implementación final.

## 1. Tipos de Tests

Se definen cuatro niveles de pruebas para garantizar la calidad y robustez del módulo:

### 1.1. Unit Tests (Pruebas Unitarias)
- **Alcance**: Validar la lógica interna de los componentes más pequeños y aislados.
- **Foco**:
    - **Máquina de Estados (FSM)**: Verificar que solo las transiciones válidas sean permitidas y que cualquier estado pueda transicionar a "error".
    - **Validación de Tipos**: Asegurar que las interfaces y tipos (ej. `ComparacionPlanosJob`, `ComparacionError`) se cumplan.
    - **Respuestas IA (Mock)**: Probar cómo reacciona la lógica de consolidación a respuestas de IA simuladas (válidas, corruptas, vacías).
    - **Manejo de Errores Básico**: Validar que las funciones de utilidad generan errores esperados ante entradas incorrectas.

### 1.2. Integration Tests (Pruebas de Integración)
- **Alcance**: Probar la interacción entre los diferentes componentes del backend (API, Firestore, Storage) usando mocks.
- **Foco**:
    - **API de Upload**: Simular la subida de archivos (válidos e inválidos), mockear la respuesta de Firebase Storage y verificar que el documento en Firestore se cree con el estado correcto (`uploaded` o `error`).
    - **API de Análisis**: Mockear los flujos de IA (Genkit) y las llamadas a Firestore/Storage para simular el pipeline completo de análisis. Validar que los estados intermedios (`analyzing-diff`, `generating-impactos`, etc.) se actualicen correctamente y que el resultado final se guarde.
    - **API de Estado**: Mockear Firestore para devolver diferentes estados de un job y asegurar que el endpoint responda correctamente.

### 1.3. IA Prompt Tests (Pruebas de Prompts de IA)
- **Alcance**: Validar la robustez y fiabilidad de los prompts enviados a los modelos de lenguaje.
- **Foco**:
    - **Formato JSON-only**: Verificar que el modelo siempre devuelva un JSON válido, sin texto adicional.
    - **Conformidad con Interfaces**: Asegurar que la estructura del JSON devuelto coincida exactamente con las interfaces TypeScript (`DiffTecnico`, `CubicacionDiferencial`, `ArbolImpactos`).
    - **Casos Borde**:
        - Simular respuestas con JSON corrupto o malformado.
        - Simular respuestas con campos faltantes o nulos.
        - Simular respuestas con estructura incorrecta.
        - Simular respuestas vacías (sin cambios detectados).

### 1.4. Smoke Tests Operacionales (Pruebas de Humo)
- **Alcance**: Pruebas manuales rápidas para verificar que el flujo de usuario básico funciona sin errores críticos en un entorno de desarrollo.
- **Foco**:
    - **Navegación**: Flujo completo: `Upload` -> `Progreso` -> `Resultados`.
    - **Estado del Job**: Verificar que la UI de progreso refleja el estado mockeado del job.
    - **Renderizado**: Confirmar que las pantallas cargan correctamente incluso sin datos (estados de carga y vacíos).
    - **Componentes de Resultado**: Asegurar que los componentes de resultados (`ResultadoDiffTecnico`, etc.) se renderizan sin errores, aunque estén vacíos.

## 2. Definición de Ambientes

- **Ambiente Aislado**: Todas las pruebas se ejecutarán en un entorno de desarrollo o CI/CD completamente aislado, sin conexión a los servicios de producción de Firebase.
- **Mocking**:
    - **Firestore**: Se utilizará un mock de `firebase-admin` y `firebase/firestore` para simular la base de datos.
    - **Storage**: Se mockearán las funciones de subida y obtención de URLs de Firebase Storage.
    - **Genkit/Google AI**: Se mockeará explícitamente la respuesta de los flujos de IA (`runDiffFlow`, `runCubicacionFlow`, `runImpactosFlow`) para evitar llamadas reales a la API de Google.

## 3. Casos de Prueba Principales

### 3.1. FSM
- **Éxito**: `pending-upload` -> `uploaded` -> `processing` -> `analyzing-diff` -> `analyzing-cubicacion` -> `generating-impactos` -> `completed`.
- **Fallo**: Transición ilegal (ej. `uploaded` -> `completed`) debe ser rechazada.
- **Error**: Cualquier estado (ej. `processing`) -> `error`.

### 3.2. API Upload
- **Éxito**: Subir dos archivos válidos. El job debe quedar en estado `uploaded`.
- **Fallo**:
    - Uno o ambos archivos faltan.
    - Archivo con extensión no permitida (ej. `.txt`).
    - Archivo que supera el límite de tamaño.
    - Mock de Storage falla al subir.
    - Mock de Firestore falla al crear el job.

### 3.3. API Analizar
- **Éxito**: Pipeline completo con mocks de IA que devuelven JSON válido. El job debe terminar en `completed`.
- **Fallo**:
    - Mock de IA devuelve JSON corrupto.
    - Mock de IA excede un timeout simulado.
    - Mock de Storage falla al obtener URL del plano.
    - Mock de Firestore falla al actualizar el estado del job.

### 3.4. API Estado
- **Éxito**: Consultar un job válido y obtener su estado.
- **Fallo**: Consultar un `jobId` que no existe (debe devolver 404).
- **Error**: Consultar un job en estado `error` (debe devolver el `errorMessage`).

### 3.5. UI (Frontend)
- **Renderizado**:
    - Cada pantalla del módulo (`/upload`, `/[jobId]`, `/[jobId]/resultado`) debe renderizarse sin errores cuando no hay datos.
    - El componente de progreso (`AnalisisProgreso`) debe mostrar correctamente un estado mockeado.
    - Los componentes de resultado deben mostrar sus placeholders cuando los datos son nulos.

## 4. Reglas de Aislamiento

- **No tocar tests existentes**: No se debe modificar ni añadir dependencias a las suites de pruebas de otros módulos.
- **No llamadas reales a IA**: Las pruebas automatizadas NUNCA deben realizar llamadas a la API de Google AI. Se usarán respuestas mockeadas.
- **No ejecutar flows reales**: Los flujos de Genkit no se ejecutarán; su resultado será simulado.
- **Mocking obligatorio**: Todo el testing automatizado debe funcionar exclusivamente con mocks.
