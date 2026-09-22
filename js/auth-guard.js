import { auth } from "./firebase-config.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";


document.documentElement.classList.add("auth-pending");

onAuthStateChanged(auth, (user) => {

    if(!user){
        window.location.replace("login.html");
        return;
    }

    document.documentElement.classList.remove("auth-pending");

});
