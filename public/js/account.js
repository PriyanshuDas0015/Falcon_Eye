import {api,initCsrf} from "./api.js";
import {toast} from "./ui.js";
import {ensureApplicationTheme} from "./theme.js";
ensureApplicationTheme();
const $=selector=>document.querySelector(selector);
async function boot(){setupMobileNavigation();await initCsrf();const{account}=await api("/api/account");$("#account-name").value=account.name;$("#account-email").value=account.email;$("#account-created").textContent=new Date(account.created_at).toLocaleDateString(undefined,{dateStyle:"long"});$("#profile-form").addEventListener("submit",saveProfile);$("#password-form").addEventListener("submit",changePassword);$("#logout").onclick=logout;}
function setupMobileNavigation(){const header=$(".workspace-header"),nav=header.querySelector("nav"),button=document.createElement("button");button.type="button";button.className="nav-toggle";button.textContent="Menu";button.setAttribute("aria-expanded","false");button.onclick=()=>{const open=nav.classList.toggle("open");button.setAttribute("aria-expanded",String(open));};header.insertBefore(button,nav);}
async function saveProfile(event){event.preventDefault();const button=event.currentTarget.querySelector("button");button.disabled=true;try{const{account}=await api("/api/account",{method:"PATCH",body:{name:$("#account-name").value}});$("#nav-user").textContent=account.name;toast("Account details updated.","success");}catch(error){toast(error.message,"error");}finally{button.disabled=false;}}
async function changePassword(event){event.preventDefault();const form=event.currentTarget,button=form.querySelector("button");button.disabled=true;try{await api("/api/account/password",{method:"POST",body:Object.fromEntries(new FormData(form))});form.reset();toast("Password changed successfully.","success");}catch(error){toast(error.message,"error");}finally{button.disabled=false;}}
async function logout(){try{await api("/api/auth/logout",{method:"POST",body:{}});}finally{location.href="/login.html";}}
boot().catch(error=>toast(error.message,"error"));
