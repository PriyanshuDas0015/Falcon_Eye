import {motion} from "./motion.js";

export function enableCursorGlow(){const target=document.querySelector(".home-dark");if(!target||motion.reduced||!motion.canHover)return;let pending=false;target.addEventListener("pointermove",event=>{if(pending)return;pending=true;requestAnimationFrame(()=>{target.style.setProperty("--cursor-x",`${event.clientX}px`);target.style.setProperty("--cursor-y",`${event.clientY}px`);pending=false;});},{passive:true});}
