import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCCWZhW9yk4DCMCg_RNUUbtCUQPdvYC5yA",
    authDomain: "fbase-naimu.firebaseapp.com",
    projectId: "fbase-naimu",
    storageBucket: "fbase-naimu.appspot.com",
    messagingSenderId: "148773338331",
    appId: "1:148773338331:web:0f72fd89a173542280e0fe"
  };


// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);