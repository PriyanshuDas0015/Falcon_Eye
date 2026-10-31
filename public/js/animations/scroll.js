import Lenis from "/vendor/lenis/lenis.mjs";
import {motion} from "./motion.js";

export function enableScrollMotion(){const gsap=window.gsap,ScrollTrigger=window.ScrollTrigger;if(gsap&&ScrollTrigger&&!motion.reduced){gsap.registerPlugin(ScrollTrigger);gsap.utils.toArray("[data-reveal]").forEach((element,index)=>gsap.from(element,{scrollTrigger:{trigger:element,start:"top 88%",once:true},y:28,opacity:0,duration:.65,delay:(index%4)*.04,ease:"power2.out"}));}
 if(motion.reduced||motion.coarse)return()=>{};const lenis=new Lenis({duration:.85,smoothWheel:true,wheelMultiplier:.85,anchors:true,prevent:node=>Boolean(node.closest("input,textarea,select,dialog,[data-lenis-prevent]"))});let frame=0;const raf=time=>{lenis.raf(time);frame=requestAnimationFrame(raf);};frame=requestAnimationFrame(raf);const cleanup=()=>{cancelAnimationFrame(frame);lenis.destroy();};window.addEventListener("pagehide",cleanup,{once:true});return cleanup;}
