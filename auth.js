import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { auth } from "./firebase-config.js";

const googleProvider = new GoogleAuthProvider();


// Auth Form Handling
const authForm = document.getElementById('auth-form');
const errorDiv = document.getElementById('auth-error');

// Google Sign In
document.getElementById('google-signin').addEventListener('click', async () => {
    errorDiv.style.display = 'none';
    try {
        await signInWithPopup(auth, googleProvider);
        window.location.href = 'index.html';
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isLogin = document.getElementById('tab-login').classList.contains('active');
    
    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
        window.location.href = 'index.html';
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
});

// Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user && window.location.pathname.includes('auth.html')) {
        window.location.href = 'index.html';
    }
});
