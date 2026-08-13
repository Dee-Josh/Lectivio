// import { initializeApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider } from "firebase/auth";
// // import { getFirestore } from "firebase/firestore";
// // import { initializeFirestore, persistentLocalCache } from "firebase/firestore";
// import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";


// const firebaseConfig = {
//   apiKey: "AIzaSyD2vdd6i4Eiaa004RytSGpBnop4ncR7Af0",
//   authDomain: "lectivio-3dd88.firebaseapp.com",
//   projectId: "lectivio-3dd88",
//   storageBucket: "lectivio-3dd88.firebasestorage.app",
//   messagingSenderId: "923689463086",
//   appId: "1:923689463086:web:aa72e0f93294a4a7109ebf",
//   measurementId: "G-3HGX390ML1"
// };

// const app = initializeApp(firebaseConfig);

// export const auth = getAuth(app);
// export const googleProvider = new GoogleAuthProvider();
// // export const db = getFirestore(app);
// // export const db = initializeFirestore(app, {
// //   localCache: persistentLocalCache(),
// // });
// export const db = initializeFirestore(app, {
//   localCache: persistentLocalCache({
//     tabManager: persistentMultipleTabManager()
//   }),
// });





// import { initializeApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider } from "firebase/auth";
// import {
//   initializeFirestore,
//   persistentLocalCache,
//   persistentMultipleTabManager,
// } from "firebase/firestore";

// const firebaseConfig = {
//   apiKey: "AIzaSyD2vdd6i4Eiaa004RytSGpBnop4ncR7Af0",
//   authDomain: "lectivio-3dd88.firebaseapp.com",
//   projectId: "lectivio-3dd88",
//   storageBucket: "lectivio-3dd88.firebasestorage.app",
//   messagingSenderId: "923689463086",
//   appId: "1:923689463086:web:aa72e0f93294a4a7109ebf",
//   measurementId: "G-3HGX390ML1",
// };

// const app = initializeApp(firebaseConfig);

// export const auth = getAuth(app);
// export const googleProvider = new GoogleAuthProvider();

// export const db = initializeFirestore(app, {
//   localCache: persistentLocalCache({
//     tabManager: persistentMultipleTabManager(),
//   }),
// });




import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD2vdd6i4Eiaa004RytSGpBnop4ncR7Af0",
  authDomain: "lectivio-3dd88.firebaseapp.com",
  projectId: "lectivio-3dd88",
  storageBucket: "lectivio-3dd88.firebasestorage.app",
  messagingSenderId: "923689463086",
  appId: "1:923689463086:web:aa72e0f93294a4a7109ebf",
  measurementId: "G-3HGX390ML1",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage = getStorage(app);
