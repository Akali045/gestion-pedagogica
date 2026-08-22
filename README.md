# 📚 Sistema de Gestión Pedagógica

[![PWA Ready](https://img.shields.io/badge/PWA-100%25%20Offline-0284c7?style=flat-square&logo=pwa)](https://developer.mozilla.org/es/docs/Web/Progressive_web_apps)
[![Security](https://img.shields.io/badge/Seguridad-AES--GCM%20256--bit-10b981?style=flat-square&logo=lock)](https://developer.mozilla.org/es/docs/Web/API/Web_Crypto_API)
[![D3.js](https://img.shields.io/badge/Sociograma-D3.js%20v7-f59e0b?style=flat-square&logo=d3.js)](https://d3js.org/)
[![License](https://img.shields.io/badge/Licencia-Uso%20Educativo-8b5cf6?style=flat-square)](LICENSE)

Plataforma web y aplicación autónoma diseñada especialmente para **docentes de educación secundaria en México**. Permite gestionar grupos, evaluar y dar seguimiento a los **Procesos de Desarrollo de Aprendizaje (PDA - Programa Sintético Fase 6)**, realizar diagnósticos socioemocionales mediante **sociogramas interactivos multicapa**, organizar **equipos de aprendizaje cooperativo** y mantener bitácoras escolares protegidas con **cifrado local de grado militar**.

---

## ✨ Características Principales

### 🏫 1. Dimensión Institucional: Centros de Trabajo (Escuelas)
- **Gestión Multi-Escuela:** Diseñado para docentes que laboran en más de un plantel educativo. Organiza tus grupos por Centro de Trabajo con C.C.T. (Clave) y Turno (Matutino, Vespertino, Nocturno, Jornada Ampliada, etc.).
- **Diagnóstico y Contexto Escolar:** Menús contraíbles para documentar **Contexto Interno** (infraestructura, recursos, plantilla), **Contexto Externo** (comunidad, dinámicas familiares y sociales) y **Problemáticas de la Escuela** (retos prioritarios, rezago y convivencia).
- **Bitácora Institucional:** Registro de acuerdos de Consejo Técnico Escolar (CTE), reuniones con directivos e incidencias con registro automático de **fecha y hora** (`DD/MM/AAAA HH:mm`).
- **Gestión de Grupos Huérfanos:** Asignación y vinculación flexible de grupos a cualquier Centro de Trabajo.

### 🔒 2. Privacidad Total y Cifrado Militar Local (AES-GCM 256 bits)
- **Cero Texto Plano:** Toda la información escolar, diagnósticos de alumnos y observaciones se almacenan localmente cifrados mediante **AES-GCM de 256 bits** derivado con **PBKDF2** (100,000 iteraciones + SHA-256).
- **Máxima Confidencialidad:** La clave sólo existe en memoria volátil durante la sesión docente. Los datos nunca se envían a servidores externos ni a la nube pública.

### 📲 3. Aplicación Offline e Instalable (PWA)
- **100% Autónoma sin Internet:** Diseñada para trabajar en aulas o salones sin conexión Wi-Fi ni datos móviles gracias a su *Service Worker* integrado.
- **Instalable en Cualquier Dispositivo:** Se instala como app nativa a pantalla completa en **Windows, Mac, Android e iOS / iPadOS**.

### 🕸️ 4. Sociograma Interactivo Multicapa (D3.js)
- **Análisis de Redes Escolares:** Visualización gráfica de afinidades académicas, sociales y complementarias.
- **Modelo Sociométrico Calibrado:** Nodos dimensionados por alcance de compañeros únicos e intensidad de vínculo (*Multiplexidad*).
- **Selector de Visualización:** Alterna entre *Flechas Dobles Individuales* y *Flechas Bidireccionales Unificadas* para despejar la vista en grupos numerosos.
- **Diagnóstico Pedagógico Automatizado:** Detección de liderazgos hegemónicos, alumnos en riesgo de aislamiento, puentes de comunicación y camarillas cerradas.

### 🧩 5. Generador Inteligente de Equipos Cooperativos
- **6 Criterios Pedagógicos de Agrupamiento:**
  1. *Canales de Aprendizaje Heterogéneos (VAK balanceado).*
  2. *Canales de Aprendizaje Homogéneos (Refuerzo focalizado).*
  3. *Intereses y Afinidades Vocacionales compartidos.*
  4. *Liderazgo Distribuido (Snake Draft por consenso sociométrico).*
  5. *Afinidad y Reciprocidad Sociométrica.*
  6. *Distribución Aleatoria Equitativa.*
- **Prevención de Conflictos:** Considera automáticamente el historial de tensiones y apoyos registrados en la bitácora escolar.

### 📥 6. Importación Masiva y Exportación a Excel / CSV
- **Carga Rápida desde Excel:** Pega directamente desde Excel, Word o archivos de texto delimitados. Detección inteligente de número de lista y nombre con previsualizador interactivo.
- **Exportación con Compatibilidad Total:** Descarga listas en formato CSV con codificación **UTF-8 con BOM**, compatible al 100% con Microsoft Excel en Windows/Mac sin problemas de acentos ni caracteres especiales (`ñ`).

### 📝 7. Seguimiento Integral y Programa Sintético (Fase 6)
- **Catálogo Inteligente de PDAs:** Selección y registro de avances por contenido y disciplina para los 3 grados de secundaria.
- **Ficha de Diagnóstico Integral:** Registro de canales VAK (Visual, Auditivo, Kinestésico), Barreras para el Aprendizaje y la Participación (BAP), intereses y aspiraciones.
- **Bitácoras con Hora y Menciones:** Registro de incidencias y observaciones con estampa de fecha y hora exacta, citando alumnos con `@Nombre` y clasificación de impacto socioemocional.

### 🎨 8. Personalización y Accesibilidad
- **Modos Claro y Oscuro.**
- **7 Paletas de Color Armónicas:** Clásico, Océano, Bosque, Índigo, Ámbar, Grafito y Rosa Suave.
- **Estilos Visuales:** Alterna entre diseño Clásico y Moderno según la preferencia del docente.

---

## 🚀 ¿Cómo Usar la Aplicación?

1. **Accede al sitio:**
   👉 [https://akali045.github.io/gestion-pedagogica/](https://akali045.github.io/gestion-pedagogica/)
2. **Establece tu Contraseña Maestra:** En tu primera visita, define una contraseña para cifrar tu base de datos local.
3. **Instala la App (Opcional pero recomendado):**
   - **En PC / Mac (Chrome o Edge):** Haz clic en el botón `📲 Instalar App` en la barra superior o en el icono de la barra de direcciones.
   - **En Android:** Toca el menú de 3 puntos `⋮` y selecciona *"Instalar aplicación"*.
   - **En iPhone / iPad:** Toca el botón Compartir `⬆` en Safari y selecciona *"Agregar al inicio"*.
4. **¡Comienza a gestionar tus grupos y alumnos!**

---

## 💾 Respaldo y Portabilidad de Datos

- **Guardado Diario:** Todos los cambios se guardan y cifran automáticamente en la memoria de tu dispositivo.
- **Copia de Seguridad:** Puedes descargar tu archivo `.json` en cualquier momento usando el botón **💾 Guardar / Exportar Datos** para conservarlo en tu memoria USB, Google Drive o enviarlo a otro dispositivo.
- **Abrir en otro equipo:** En cualquier dispositivo nuevo, abre el archivo `.json`, introduce tu contraseña maestra y todos tus datos se restaurarán de inmediato.

---

## 🛠️ Tecnologías Utilizadas

- **HTML5 Semántico & CSS3 Moderno:** Variables CSS nativas, glassmorphism, temas dinámicos y diseño responsivo sin dependencias pesadas.
- **JavaScript Vanilla (ES6+):** Código modular y ligero sin frameworks que sobrecarguen el rendimiento.
- **Web Crypto API:** Cifrado simétrico AES-GCM de 256 bits y derivación de claves con PBKDF2 (SHA-256).
- **Service Workers & Web App Manifest:** Soporte para Progressive Web App (PWA) con almacenamiento en caché local y funcionamiento offline.
- **D3.js (Data-Driven Documents v7):** Motor de simulación de fuerzas para sociogramas interactivos.
- **HTML2PDF.js:** Generación y descarga de reportes y fichas en PDF.

---

## 📄 Licencia

Este proyecto es de **código abierto** y está disponible para la comunidad educativa y docente con fines pedagógicos y sin fines de lucro.
