const reducedQuery=window.matchMedia("(prefers-reduced-motion: reduce)");
const mobileQuery=window.matchMedia("(max-width: 639px)");
const tabletQuery=window.matchMedia("(max-width: 1024px)");
const coarseQuery=window.matchMedia("(pointer: coarse)");

export const motion={
 get reduced(){return reducedQuery.matches;},
 get mobile(){return mobileQuery.matches;},
 get tablet(){return tabletQuery.matches;},
 get coarse(){return coarseQuery.matches;},
 get canHover(){return !coarseQuery.matches&&window.matchMedia("(hover: hover)").matches;}
};

export function onMotionPreferenceChange(callback){reducedQuery.addEventListener?.("change",callback);return()=>reducedQuery.removeEventListener?.("change",callback);}

export function supportsWebGL(){try{const canvas=document.createElement("canvas");return Boolean(window.WebGLRenderingContext&&(canvas.getContext("webgl")||canvas.getContext("experimental-webgl")));}catch{return false;}}
