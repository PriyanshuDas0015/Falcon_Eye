import {api} from "./api.js";
import {createEarthScene} from "./animations/three-scene.js";
import {animateHero,enableMagneticButtons} from "./animations/hero.js";
import {enableCardTilt} from "./animations/cards.js";
import {enableCursorGlow} from "./animations/cursor.js";
import {enableScrollMotion} from "./animations/scroll.js";

const icons={vegetation:"⌁","crop-health":"◒",deforestation:"♧",water:"≈",flood:"≋",fire:"♨","urban-growth":"▥","land-use":"▦","construction-change":"⌂",buildings:"▤",roads:"⌇",environment:"◎"};
const labels={REQUIRES_EARTH_ENGINE:"Configuration required",PLANNED:"Planned",AVAILABLE:"Available",EXPERIMENTAL:"Experimental"};
const imagery={
 vegetation:{src:"/assets/imagery/vegetation-modis.jpg",alt:"NASA MODIS view of the Americas",credit:"NASA MODIS"},
 "crop-health":{src:"/assets/imagery/vegetation-modis.jpg",alt:"NASA MODIS view showing vegetation across the Americas",credit:"NASA MODIS"},
 deforestation:{src:"/assets/imagery/vegetation-modis.jpg",alt:"NASA MODIS observation of forested regions in the Americas",credit:"NASA MODIS"},
 water:{src:"/assets/imagery/water-landsat.jpg",alt:"Landsat 9 observation of Lake Erie and Lake St. Clair",credit:"Landsat 9"},
 flood:{src:"/assets/imagery/water-landsat.jpg",alt:"Landsat 9 observation of connected Great Lakes waterways",credit:"Landsat 9"},
 fire:{src:"/assets/imagery/land-cover-modis.jpg",alt:"NASA MODIS land-cover visualization across Europe",credit:"NASA MODIS"},
 "urban-growth":{src:"/assets/imagery/urban-landsat.jpg",alt:"Landsat observation of Cairo and the Nile corridor",credit:"Landsat 8"},
 "construction-change":{src:"/assets/imagery/urban-landsat.jpg",alt:"Landsat observation of urban development around Cairo",credit:"Landsat 8"},
 buildings:{src:"/assets/imagery/urban-landsat.jpg",alt:"Landsat observation of the Cairo metropolitan region",credit:"Landsat 8"},
 roads:{src:"/assets/imagery/urban-landsat.jpg",alt:"Landsat observation showing regional infrastructure near Cairo",credit:"Landsat 8"},
 "land-use":{src:"/assets/imagery/land-cover-modis.jpg",alt:"NASA MODIS land-cover classification visualization",credit:"MODIS land cover"},
 environment:{src:"/assets/imagery/land-cover-modis.jpg",alt:"NASA MODIS land-cover visualization",credit:"MODIS land cover"}
};

function capabilityCard(capability,datasets){const card=document.createElement("article");card.className="command-card";card.dataset.tilt="";const visual=document.createElement("figure");visual.className="card-imagery";const image=document.createElement("img"),visualData=imagery[capability.id]||imagery.environment;image.src=visualData.src;image.alt=visualData.alt;image.loading="lazy";image.decoding="async";const sourceBadge=document.createElement("span");sourceBadge.className="imagery-source";sourceBadge.textContent=visualData.credit;visual.append(image,sourceBadge);const top=document.createElement("div");top.className="card-top";const icon=document.createElement("span");icon.className="cap-icon";icon.setAttribute("aria-hidden","true");icon.textContent=icons[capability.id]||"◉";const status=document.createElement("span");status.className=`status-line ${capability.status.toLowerCase()}`;status.textContent=labels[capability.status]||capability.status;status.title=`Capability status: ${status.textContent}`;top.append(icon,status);const title=document.createElement("h3");title.className="truncate";title.textContent=capability.name;title.title=capability.name;const description=document.createElement("p");description.className="line-clamp-3";description.textContent=capability.description;description.title=capability.description;const footer=document.createElement("div");footer.className="card-footer";const sources=document.createElement("span");const names=(capability.supportedDatasets||[]).map(id=>datasets[id]?.name||id);sources.className="truncate";sources.textContent=names.length?names.join(" · "):"Dataset pending";sources.title=names.join(", ")||"Dataset pending";const arrow=document.createElement("i");arrow.textContent="→";footer.append(sources,arrow);card.append(visual,top,title,description,footer);return card;}

async function renderCapabilities(){const host=document.querySelector("#capability-grid"),extraHost=document.querySelector("#additional-capabilities"),expand=document.querySelector("#show-all-capabilities");try{const{capabilities,datasets}=await api("/api/capabilities");document.querySelector("#method-count").textContent=`${capabilities.length}`;document.querySelector("#dataset-count").textContent=`${Object.keys(datasets).length}`;const priority=["vegetation","water","land-use","urban-growth"],ordered=[...capabilities].sort((a,b)=>{const ai=priority.indexOf(a.id),bi=priority.indexOf(b.id);return(ai<0?priority.length:ai)-(bi<0?priority.length:bi);}),featured=ordered.slice(0,4),rest=ordered.slice(4);host.replaceChildren(...featured.map(capability=>capabilityCard(capability,datasets)));extraHost.replaceChildren(...rest.map(capability=>capabilityCard(capability,datasets)));if(rest.length){expand.hidden=false;expand.addEventListener("click",()=>{const open=extraHost.classList.toggle("is-open");expand.setAttribute("aria-expanded",String(open));expand.innerHTML=open?'Show fewer capabilities <span aria-hidden="true">↑</span>':'View all capabilities <span aria-hidden="true">↓</span>';},{once:false});}enableCardTilt();}catch(error){host.replaceChildren();const state=document.createElement("div");state.className="capability-error";state.textContent=`Capability registry unavailable: ${error.message}`;host.append(state);}}

function navigation(){const header=document.querySelector("#site-nav"),toggle=document.querySelector("#home-menu-toggle"),nav=document.querySelector("#home-nav");toggle.addEventListener("click",()=>{const open=nav.classList.toggle("open");toggle.setAttribute("aria-expanded",String(open));});window.addEventListener("scroll",()=>header.classList.toggle("compact",window.scrollY>36),{passive:true});nav.addEventListener("click",()=>{nav.classList.remove("open");toggle.setAttribute("aria-expanded","false");});}

function boot(){navigation();createEarthScene(document.querySelector("#earth-stage"));animateHero();enableMagneticButtons();enableCursorGlow();enableScrollMotion();renderCapabilities();}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
