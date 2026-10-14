# 📚 Sistema de Gestión Pedagógica

[![Version](https://img.shields.io/badge/Versi%C3%B3n-v1.1.0-0284c7?style=flat-square&logo=git)](https://github.com/akali045/gestion-pedagogica)
[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-0284c7?style=flat-square&logo=pwa)](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
[![Cloud Sync](https://img.shields.io/badge/Nube-Firebase%20Offline--First-f59e0b?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Security](https://img.shields.io/badge/Seguridad-AES--GCM%20256--bit-10b981?style=flat-square&logo=lock)](https://developer.mozilla.org/es/docs/Web/API/Web_Crypto_API)
[![D3.js](https://img.shields.io/badge/Sociograma-D3.js%20v7-f59e0b?style=flat-square&logo=d3.js)](https://d3js.org/)
[![License](https://img.shields.io/badge/Licencia-Uso%20Educativo-8b5cf6?style=flat-square)](LICENSE)

Plataforma web y aplicación autónoma diseñada especialmente para **docentes de educación secundaria en México (Nueva Escuela Mexicana - NEM)**. Permite gestionar grupos escolares, sincronizar tus datos en tiempo real entre múltiples dispositivos con arquitectura **Offline-First**, llevar un control ágil de **asistencia con estadísticas**, diagnosticar estilos de aprendizaje (VAK múltiple), evaluar y dar seguimiento a los **Procesos de Desarrollo de Aprendizaje (PDA - Fase 6)**, realizar diagnósticos socioemocionales mediante **sociogramas interactivos D3.js**, organizar **equipos de aprendizaje cooperativo** y mantener bitácoras escolares protegidas con **cifrado local de grado militar**.

---

## ✨ Novedades Destacadas en la v1.1.0

- ☁️ **Sincronización en la Nube Multi-Dispositivo (Firebase Offline-First):** Pasa lista desde tu teléfono en el aula y continúa trabajando en tu computadora de casa sin compartir archivos manualmente. Si no hay internet, guarda de forma local en `IndexedDB` y sube los cambios al recuperar conexión.
- 📋 **Módulo Integral de Control y Registro de Asistencia:**
  - Toma diaria ágil con botones de 1 clic: Presente (**P**), Ausente (**A**), Retardo (**R**) y Justificado (**J**).
  - Acciones rápidas por lote (*✓ Todos Presentes* y *✗ Todos Ausentes*).
  - Resaltado estético y vibrante de **nombres preferidos** `(Nombre)` junto al nombre oficial completo.
  - Matriz histórica concentrada por fechas con acceso directo para edición.
  - Estadísticas automáticas (% de asistencia global e individual) y **alerta de ausentismo crítico** (≥ 20% de faltas).
  - Exportación completa a CSV/Excel con codificación UTF-8 con BOM.
- 📖 **Disciplinas y Asignaturas por Grupo:** Asigna una o varias disciplinas por grupo (Español, Matemáticas, Ciencias, Historia, etc.) con filtrado inteligente de contenidos y PDAs.
- 🧠 **Canales de Aprendizaje Múltiples (Empates VAK):** Registro flexible para alumnos que empatan en dos o tres canales (Visual, Auditivo, Kinestésico), con bordes degradados en el sociograma y análisis en gráficos.
- ↕️ **Organizador Alfabético y Recorrimiento de Lista:** Ordena automáticamente a los alumnos por orden alfabético estricto de apellidos y realiza el recorrimiento automático de números de lista cuando un alumno es transferido o dado de baja.

---

## 🌟 Módulos y Características del Sistema

### ☁️ 1. Modelo Híbrido de Datos y Sincronización en la Nube
- **Sincronización Transparente en Tiempo Real:** Integración nativa con **Firebase Firestore** para sincronizar instantáneamente tus grupos entre teléfono, tableta y computadora.
- **Acceso con 1 Clic:** Ingreso rápido mediante *"Continuar con Google"* o correo electrónico y contraseña.
- **100% Funcional sin Internet:** Almacenamiento local en caché y en `IndexedDB`. Puedes pasar lista o registrar observaciones en salones sin señal; todo se sube automáticamente cuando detecta Wi-Fi o datos móviles.
- **Respaldo Físico Garantizado:** El docente mantiene el control total: en cualquier momento puede presionar *"Descargar Copia de Respaldo JSON"* para conservar su archivo físico en memoria USB.

### 📋 2. Control de Asistencia y Concentrado Histórico
- **Pase de Lista Ágil:** Tabla con colores de alumnos, nombres completos y nombres preferidos estilizados en color llamativo de alto contraste.
- **Botones Segmentados Instantáneos:** Estados P, A, R y J con actualización en el DOM en tiempo real, sin recargas ni saltos de pantalla.
- **Matriz de Asistencia por Fechas:** Vista tipo sábana o concentrado donde se aprecian todas las sesiones impartidas.
- **Semáforo y Detección de Riesgo:** Identificación inmediata de alumnos con inasistencias acumuladas para prevenir el abandono escolar.
- **Exportación a Excel / CSV:** Genera reportes oficiales con BOM UTF-8 compatibles con Microsoft Excel sin errores de codificación.

### 🏫 3. Dimensión Institucional: Centros de Trabajo (Escuelas)
- **Gestión Multi-Plantel:** Organiza tus grupos por Centro de Trabajo con C.C.T. (Clave) y Turno (Matutino, Vespertino, etc.).
- **Diagnóstico y Contexto Escolar:** Menús contraíbles para documentar **Contexto Interno**, **Contexto Externo** y **Problemáticas Prioritarias de la Escuela**.
- **Bitácora Institucional:** Registro de acuerdos de Consejo Técnico Escolar (CTE), reuniones con directivos e incidencias con registro automático de fecha y hora (`DD/MM/AAAA HH:mm`).

### 🔒 4. Privacidad Total y Cifrado Local (AES-GCM 256 bits)
- **Cero Texto Plano:** Toda la información escolar se almacena localmente cifrada mediante **AES-GCM de 256 bits** derivado con **PBKDF2** (100,000 iteraciones + SHA-256).
- **Máxima Confidencialidad:** La clave de descifrado sólo reside en memoria volátil durante la sesión docente.

### 🕸️ 5. Sociograma Interactivo Multicapa (D3.js)
- **Análisis de Redes Escolares:** Visualización gráfica con simulación de fuerzas de afinidades académicas, sociales y complementarias.
- **Diagnóstico Socioemocional Automatizado:** Detección de liderazgos hegemónicos, alumnos en riesgo de exclusión/aislamiento, puentes de comunicación y camarillas cerradas.
- **Filtros Dinámicos:** Selector para alternar entre flechas bidireccionales unificadas o dobles independientes.

### 🧩 6. Generador Inteligente de Equipos Cooperativos
- **Criterios Pedagógicos de Formación:**
  1. *Diversidad de canales de aprendizaje (VAK balanceado).*
  2. *Refuerzo focalizado por canal predominante.*
  3. *Liderazgo distribuido (reparto equitativo de los alumnos más elegidos).*
  4. *Afinidad académica y social (emisiones).*
  5. *Complementariedad sociométrica.*
  6. *Distribución aleatoria equitativa.*
- **Prevención de Conflictos:** Considera automáticamente el historial de tensiones y apoyos mutuos registrados en la bitácora escolar.
- **Ajuste Manual por Arrastre (Drag & Drop):** Permite mover alumnos entre equipos y exportar el resultado como imagen PNG.

### 📝 7. Programa Sintético (Fase 6) y Seguimiento de PDAs
- **Catálogo Inteligente de PDAs:** Selección y avance curricular de contenidos y PDA clasificados por disciplina y grado escolar.
- **Actividades por PDA:** Planificación y estatus de actividades vinculadas al PDA activo (*Planeada*, *En proceso*, *Concluida*, *Pausada*).
- **Historial Curricular:** Registro histórico de PDAs concluidos con fechas de inicio y término.

### 📲 8. Aplicación Offline e Instalable (PWA)
- **Instalable como App Nativa:** Compatible con **Windows, Mac, Android e iOS / iPadOS**.
- **Acceso Directo:** Ícono en pantalla de inicio, modo pantalla completa sin barras de navegador y carga ultra rápida.

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

## 🛠️ Tecnologías y Librerías

- **Frontend Core:** HTML5 Semántico y Vanilla JavaScript modular (ES6+).
- **Diseño y Estilos:** Vanilla CSS moderno con variables personalizadas, diseño responsivo y temas dinámicos (Claro/Oscuro, 7 paletas de color).
- **Sincronización y Backend Serverless:** Firebase Authentication y Cloud Firestore con persistencia multi-pestaña `IndexedDB`.
- **Criptografía:** Web Crypto API con algoritmo AES-GCM (256 bits) y PBKDF2 (SHA-256).
- **PWA & Offline:** Service Worker con estrategia de caché inteligente y manifiesto Web App.
- **Visualización de Redes:** D3.js v7 (Force Simulation).
- **Reportes:** HTML2PDF.js y exportación CSV RFC 4180 con UTF-8 BOM.

---

## 📄 Licencia

Este proyecto es de **código abierto** y está disponible para la comunidad educativa y docente con fines pedagógicos, didácticos y sin fines de lucro.
