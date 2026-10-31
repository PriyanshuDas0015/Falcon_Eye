export function toast(message,type="info"){
 let region=document.querySelector("#toast-region");
 if(!region){region=document.createElement("div");region.id="toast-region";region.className="toast-region";region.setAttribute("aria-live","polite");document.body.append(region);}
 const item=document.createElement("div");item.className=`toast ${type}`;item.textContent=message;region.append(item);setTimeout(()=>item.remove(),5000);
}
export function confirmAction({title,message,confirmLabel="Confirm"}){
 return new Promise(resolve=>{const dialog=document.createElement("dialog");dialog.className="confirm-dialog";const heading=document.createElement("h2");heading.textContent=title;const copy=document.createElement("p");copy.textContent=message;const actions=document.createElement("div");actions.className="dialog-actions";const cancel=document.createElement("button");cancel.className="button button-quiet";cancel.textContent="Cancel";const confirm=document.createElement("button");confirm.className="button danger";confirm.textContent=confirmLabel;actions.append(cancel,confirm);dialog.append(heading,copy,actions);document.body.append(dialog);const close=value=>{dialog.close();dialog.remove();resolve(value);};cancel.onclick=()=>close(false);confirm.onclick=()=>close(true);dialog.addEventListener("cancel",event=>{event.preventDefault();close(false);});dialog.showModal();cancel.focus();});
}
