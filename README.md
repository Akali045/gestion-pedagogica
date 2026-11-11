# 📚 Sistema de Gestión Pedagógica

[![Version](https://img.shields.io/badge/Versi%C3%B3n-v1.1.0.8-0284c7?style=flat-square&logo=git)](https://github.com/akali045/gestion-pedagogica)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-0284c7?style=flat-square&logo=pwa)](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
[![Cloud Sync](https://img.shields.io/badge/Nube-Firebase%20Firestore%20v2-f59e0b?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Security](https://img.shields.io/badge/Seguridad-AES--GCM%20256--bit-10b981?style=flat-square&logo=lock)](https://developer.mozilla.org/es/docs/Web/API/Web_Crypto_API)
[![D3.js](https://img.shields.io/badge/Sociograma-D3.js%20v7-f59e0b?style=flat-square&logo=d3.js)](https://d3js.org/)
[![License](https://img.shields.io/badge/Licencia-Uso%20Educativo-8b5cf6?style=flat-square)](LICENSE)

Plataforma web y aplicación autónoma diseñada especialmente para **docentes de educación secundaria en México (Nueva Escuela Mexicana - NEM)**. Permite gestionar grupos escolares, sincronizar tus datos en tiempo real entre múltiples dispositivos con arquitectura **Offline-First**, pasar lista desde un acceso rápido diario (**Mi Día**), llevar un control ágil de **asistencia por día y por trimestre**, diagnosticar estilos de aprendizaje (VAK múltiple), dar seguimiento a los **Procesos de Desarrollo de Aprendizaje (PDA - Fase 6)**, realizar diagnósticos socioemocionales mediante **sociogramas interactivos D3.js**, organizar **equipos de aprendizaje cooperativo** y mantener bitácoras escolares protegidas con **cifrado local AES-GCM**.

---

## ✨ Novedades Recientes (hasta v1.1.0.8)

- 📆 **Vista "Mi Día" y Horario Semanal por Grupo:** Panel de acceso rápido en la pantalla principal que muestra automáticamente los grupos con clase programada para hoy, con botones directos de 1 clic para **Pasar lista** o abrir **Bitácora**.
- 🗓️ **Periodos Escolares / Trimestres Definibles:** Crea tus propios trimestres o periodos de evaluación (con opción de generar automáticamente los 3 trimestres sugeridos del ciclo escolar) y utilízalos para filtrar estadísticas, historiales y exportaciones con 1 clic.
- 📅 **Desglose Día por Día y Exportación por Periodo en Asistencia:**
  - Sección **Días con Pase de Lista y Asistentes** que muestra por fecha quiénes estuvieron presentes, ausentes, con retardo o justificados sin tener que revisar día por día manualmente.
  - Filtros rápidos por rango de fechas (`Todo`, `Este mes`, `30 días`, `90 días` o por trimestre activo).
  - Modal **Exportar Asistencia (CSV/Excel)** con selección específica de trimestre o rango de fechas personalizado.
- ☁️ **Sincronización Particionada en la Nube (Firestore v2) y Preservación de Borradores:**
  - Base particionada en subcolecciones (`users/{uid}/schools/{schoolId}` y `users/{uid}/groups/{groupId}`) con escritura incremental en lotes, respaldo automático pre-migración (`backups/v1_legacy`) y modo de compatibilidad v1.
  - Fusión bidireccional sin sobrescritura (`smartMergeAppData`) que conserva notas de bitácora y registros de asistencia en curso aunque se pierda temporalmente la conexión o lleguen actualizaciones desde otro dispositivo.
- 📋 **Módulo Integral de Control y Registro de Asistencia:**
  - Toma diaria ágil con botones de 1 clic: Presente (**P**), Ausente (**A**), Retardo (**R**) y Justificado (**J**), más acciones rápidas por lote (*✓ Todos Presentes* y *✗ Todos Ausentes*).
  - Resaltado estético de **nombres preferidos** `(Nombre)` junto al nombre oficial completo, matriz histórica y **alerta de ausentismo crítico** (≥ 20% de faltas).
- 📖 **Disciplinas, Empates VAK y Organizador Alfabético:** Múltiples asignaturas por grupo, empates de aprendizaje Visual/Auditivo/Kinestésico con visualización en sociograma y ordenamiento alfabético con recorrimiento automático de número de lista.

---

## 🌟 Módulos y Características del Sistema

### ☁️ 1. Modelo Híbrido de Datos y Sincronización Particionada (v2)
- **Sincronización Incremental en Tiempo Real:** Integración con **Firebase Firestore** mediante estructura particionada por escuela y grupo (`schools` y `groups` como subcolecciones de `users/{uid}`), enviando únicamente los documentos modificados y manteniendo ligero el documento raíz.
- **Migración Segura y Compatibilidad:** Conversión automática y atómica desde el formato v1 hacia subcolecciones v2 (con copia de respaldo pre-migración en `backups/v1_legacy` y respaldo automático a v1 ante `permission-denied`).
- **Acceso con 1 Clic y Trabajo sin Internet:** Ingreso mediante *"Continuar con Google"* o correo electrónico y contraseña, con persistencia multi-pestaña de Firestore (`IndexedDB`) y almacenamiento local en el navegador para seguir trabajando sin señal y preservar borradores al reconectar.
- **Respaldo Físico Garantizado:** El docente mantiene el control total mediante *"Descargar Copia de Respaldo JSON"* en cualquier momento.

### 📆 2. Panel "Mi Día" y Periodos Escolares (Trimestres)
- **Agenda Docente Diaria:** Configura los días de clase dentro de cada grupo para ver en la vista principal únicamente los grupos que te corresponden hoy, con atajos directos a asistencia y bitácora.
- **Trimestres y Ciclos Personalizados:** Define fechas de inicio/fin por trimestre o genera los 3 trimestres del ciclo escolar para mantener enfocados tus reportes e historiales al cambiar de periodo.

### 📋 3. Control de Asistencia, Desglose Diario y Exportación Filtrada
- **Pase de Lista Ágil:** Tabla con botones segmentados P, A, R y J, nombres preferidos estilizados y conservación de notas y foco ante sincronizaciones en segundo plano.
- **Días con Pase de Lista y Asistentes:** Resumen cronológico descendente con las listas de alumnos por estatus en cada fecha tomada.
- **Filtros y Exportación por Periodo:** Filtra estadísticas, matriz histórica y archivos **Excel / CSV** (RFC 4180 con UTF-8 BOM) por rango de fechas o por trimestre definido.
- **Semáforo y Detección de Riesgo:** Identificación inmediata de alumnos con inasistencias acumuladas (≥ 20%) para prevenir el abandono escolar.

### 🏫 4. Dimensión Institucional: Centros de Trabajo (Escuelas)
- **Gestión Multi-Plantel:** Organiza tus grupos por Centro de Trabajo con C.C.T. (Clave) y Turno (Matutino, Vespertino, etc.).
- **Diagnóstico y Contexto Escolar:** Menús contraíbles para documentar **Contexto Interno**, **Contexto Externo** y **Problemáticas Prioritarias de la Escuela**.
- **Bitácora Institucional:** Registro de acuerdos de Consejo Técnico Escolar (CTE), reuniones con directivos e incidencias con registro automático de fecha y hora (`DD/MM/AAAA HH:mm`).

### 🔒 5. Privacidad Total y Cifrado Local (AES-GCM 256 bits)
- **Cero Texto Plano en Modo Local:** La información respaldada localmente se cifra mediante **AES-GCM de 256 bits** derivado con **PBKDF2** (100,000 iteraciones + SHA-256).
- **Máxima Confidencialidad:** La clave de descifrado sólo reside en memoria volátil durante la sesión docente.

### 🕸️ 6. Sociograma Interactivo Multicapa (D3.js)
- **Análisis de Redes Escolares:** Visualización gráfica con simulación de fuerzas de afinidades académicas, sociales y complementarias.
- **Diagnóstico Socioemocional Automatizado:** Detección de liderazgos hegemónicos, alumnos en riesgo de exclusión/aislamiento, puentes de comunicación y camarillas cerradas.
- **Filtros Dinámicos:** Selector para alternar entre flechas bidireccionales unificadas o dobles independientes.

### 🧩 7. Generador Inteligente de Equipos Cooperativos
- **Criterios Pedagógicos de Formación:**
  1. *Diversidad de canales de aprendizaje (VAK balanceado).*
  2. *Refuerzo focalizado por canal predominante.*
  3. *Liderazgo distribuido (reparto equitativo de los alumnos más elegidos).*
  4. *Afinidad académica y social (emisiones).*
  5. *Complementariedad sociométrica.*
  6. *Distribución aleatoria equitativa.*
- **Prevención de Conflictos:** Considera automáticamente el historial de tensiones y apoyos mutuos registrados en la bitácora escolar.
- **Ajuste Manual por Arrastre (Drag & Drop):** Permite mover alumnos entre equipos y exportar el resultado como imagen PNG.

### 📝 8. Programa Sintético (Fase 6) y Seguimiento de PDAs
- **Catálogo Inteligente de PDAs:** Selección y avance curricular de contenidos y PDA clasificados por disciplina y grado escolar.
- **Actividades por PDA:** Planificación y estatus de actividades vinculadas al PDA activo (*Planeada*, *En proceso*, *Concluida*, *Pausada*).
- **Historial Curricular:** Registro histórico de PDAs concluidos con fechas de inicio y término.

### 📲 9. Aplicación Offline e Instalable (PWA)
- **Instalable como App Nativa:** Compatible con **Windows, Mac, Android e iOS / iPadOS** con caché gestionado mediante Service Worker (`gestion-pedagogica-v1.1.0.8`).
- **Acceso Directo:** Ícono en pantalla de inicio, modo pantalla completa sin barras de navegador y carga rápida.

---

## 🚀 ¿Cómo Usar la Aplicación?

1. **Accede a la plataforma:**
   👉 [https://akali045.github.io/gestion-pedagogica/](https://akali045.github.io/gestion-pedagogica/)
2. **Elige tu Modo de Acceso:**
   - **Con Nube (Recomendado):** Haz clic en *"Continuar con Google"* o ingresa con correo para habilitar la sincronización automática entre tu teléfono y tu PC.
   - **Modo Local:** Define una contraseña maestra para cifrar tus datos únicamente en la memoria local de tu dispositivo.
3. **Instala la App en tu Dispositivo:**
   - **En PC / Mac (Chrome o Edge):** Haz clic en el botón `📲 Instalar App` en la barra superior o en el icono de instalación de la barra de direcciones.
   - **En Android:** Toca el menú de 3 puntos `⋮` y selecciona *"Instalar aplicación"*.
   - **En iPhone / iPad:** Toca el botón Compartir `⬆` en Safari y selecciona *"Agregar al inicio"*.
4. **¡Comienza a gestionar tus Centros de Trabajo, grupos y alumnos!**

---

## 💾 Respaldo y Portabilidad de Datos

- **Guardado Automático Híbrido:** Cada cambio se guarda de forma instantánea tanto en el almacenamiento local del dispositivo como en la nube privada.
- **Copia de Seguridad en Archivo JSON:** Siempre puedes presionar el botón **💾 Guardar / Exportar Datos** para descargar una copia física en formato `.json` legible y respaldable en una memoria USB o disco externo.
- **Apertura en Cualquier Equipo:** Si no deseas usar la nube, abre tu archivo `.json` arrastrándolo a la pantalla de inicio e introduce tu contraseña.

---

## 🔐 Reglas de Seguridad de Firestore (Autoalojamiento)

Si despliegas tu propia instancia con Firebase, tus reglas de **Cloud Firestore** deben habilitar el acceso por usuario autenticado tanto al documento raíz `users/{userId}` como a sus subcolecciones particionadas (`schools`, `groups` y `backups`):

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🛠️ Tecnologías y Librerías

- **Frontend Core:** HTML5 Semántico y Vanilla JavaScript modular (ES6+).
- **Diseño y Estilos:** Vanilla CSS moderno con variables personalizadas, diseño responsivo y temas dinámicos (Claro/Oscuro, 7 paletas de color).
- **Sincronización y Backend Serverless:** Firebase Authentication y Cloud Firestore (esquema v2 particionado en subcolecciones) con persistencia multi-pestaña `IndexedDB`.
- **Criptografía:** Web Crypto API con algoritmo AES-GCM (256 bits) y PBKDF2 (SHA-256).
- **PWA & Offline:** Service Worker con estrategia de caché inteligente y manifiesto Web App.
- **Visualización de Redes:** D3.js v7 (Force Simulation).
- **Reportes:** HTML2PDF.js y exportación CSV RFC 4180 con UTF-8 BOM.

---

## 📄 Licencia

Este proyecto es de **código abierto** y está disponible para la comunidad educativa y docente con fines pedagógicos, didácticos y sin fines de lucro.
