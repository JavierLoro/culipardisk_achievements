const appConfig = window.APP_CONFIG || {};
const firebaseConfig = appConfig.firebase;
const allowedEmails = appConfig.auth?.allowedEmails || [];

let firebaseApp = null;
let auth = null;
let GoogleAuthProvider = null;
let signInWithPopup = null;
let signOutFn = null;
let authReady = false;
const listeners = new Set();

async function initializeFirebase() {
  if (authReady || !firebaseConfig) {
    authReady = true;
    return;
  }

  try {
    const [{ initializeApp }, authModule] = await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
    ]);

    firebaseApp = initializeApp(firebaseConfig);
    auth = authModule.getAuth(firebaseApp);
    GoogleAuthProvider = authModule.GoogleAuthProvider;
    signInWithPopup = authModule.signInWithPopup;
    signOutFn = authModule.signOut;

    authModule.onAuthStateChanged(auth, (user) => {
      if (user && allowedEmails.length > 0 && !allowedEmails.includes(user.email)) {
        // Usuario no autorizado, cerrar sesión inmediatamente
        signOutFn(auth);
        notifyListeners(null);
        return;
      }
      notifyListeners(user);
    });

    authReady = true;
  } catch (error) {
    console.error('No fue posible inicializar Firebase:', error);
    authReady = false;
  }
}

function notifyListeners(user) {
  listeners.forEach((listener) => {
    try {
      listener(user);
    } catch (err) {
      console.error('Error en listener de autenticación:', err);
    }
  });
}

export function onAuthStateChange(callback) {
  listeners.add(callback);
  if (authReady && auth) {
    callback(auth.currentUser);
  }
  initializeFirebase().then(() => {
    if (authReady && auth) {
      callback(auth.currentUser);
    }
  });

  return () => listeners.delete(callback);
}

export async function signInWithGoogle() {
  await initializeFirebase();
  if (!auth || !GoogleAuthProvider || !signInWithPopup) {
    throw new Error('Firebase Authentication no está configurado.');
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  await signInWithPopup(auth, provider);
}

export async function signOutUser() {
  if (!auth || !signOutFn) return;
  await signOutFn(auth);
}

export function isAuthConfigured() {
  return Boolean(firebaseConfig);
}

export function getCurrentUser() {
  return auth?.currentUser || null;
}

export async function getAuthToken(forceRefresh = false) {
  if (!auth) return null;
  const user = auth.currentUser;
  if (!user) return null;

  return user.getIdToken(forceRefresh);
}

// Exponer funciones en window para depuración opcional
window.FirebaseAuth = {
  onAuthStateChange,
  signInWithGoogle,
  signOutUser,
  isAuthConfigured,
  getCurrentUser,
  getAuthToken
};
