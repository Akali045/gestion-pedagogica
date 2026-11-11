// Firebase Configuration and Initialization for Gestión Pedagógica

const firebaseConfig = {
  apiKey: "AIzaSyAUQ-qmVESUwj46ue4Bnxk2KXDsdal-npc",
  authDomain: "gestionpedagogica-f8c1c.firebaseapp.com",
  projectId: "gestionpedagogica-f8c1c",
  storageBucket: "gestionpedagogica-f8c1c.firebasestorage.app",
  messagingSenderId: "595469057300",
  appId: "1:595469057300:web:4996fb314d3479ff275601",
  measurementId: "G-S7BEFMEF6V"
};

let firebaseApp = null;
let firestoreDb = null;
let firebaseAuthInstance = null;

function initFirebase() {
  if (typeof firebase === 'undefined' || !firebase.initializeApp) {
    console.warn("Firebase SDK no cargado aún.");
    return false;
  }

  try {
    if (!firebase.apps || firebase.apps.length === 0) {
      firebaseApp = firebase.initializeApp(firebaseConfig);
    } else {
      firebaseApp = firebase.app();
    }

    firebaseAuthInstance = firebase.auth();
    firestoreDb = firebase.firestore();

    // Enable multi-tab offline persistence
    firestoreDb.enablePersistence({ synchronizeTabs: true }).catch(err => {
      if (err.code === 'failed-precondition') {
        console.warn("Persistencia Firestore: Múltiples pestañas abiertas al mismo tiempo.");
      } else if (err.code === 'unimplemented') {
        console.warn("Este navegador no soporta persistencia offline en Firestore.");
      }
    });

    return true;
  } catch (err) {
    console.error("Error al inicializar Firebase:", err);
    return false;
  }
}
