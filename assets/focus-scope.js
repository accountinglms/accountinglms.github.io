// Shared keyboard behavior for the existing modal surfaces, including nested dialogs.
const scopes=[];
const selector='a[href],button,input,select,textarea,[tabindex]';
const visible=element=>element?.isConnected&&element.getClientRects().length&&!element.closest('[inert]')&&getComputedStyle(element).visibility!=='hidden';
const focusable=root=>[...root.querySelectorAll(selector)].filter(el=>!el.disabled&&el.tabIndex>=0&&visible(el));

export function activateFocusScope(root,{onEscape,initialFocus}={}){
  const previous=document.activeElement;
  const inertStates=new Map();
  for(let branch=root;branch&&branch!==document.body;branch=branch.parentElement){
    for(const sibling of branch.parentElement?.children||[]){
      if(sibling===branch)continue;
      inertStates.set(sibling,sibling.inert);
      sibling.inert=true;
    }
  }
  const scope={root,closed:false,inertStates,previous};
  scopes.push(scope);
  root.setAttribute('tabindex','-1');
  const top=()=>scopes.at(-1)===scope&&!scope.closed;
  const focusFirst=()=>{
    const target=initialFocus&&visible(initialFocus)?initialFocus:focusable(root)[0]||root;
    target.focus({preventScroll:true});
  };
  const keydown=event=>{
    if(!top())return;
    if(event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();onEscape?.();
    }else if(event.key==='Tab'){
      const nodes=focusable(root),first=nodes[0],last=nodes.at(-1);
      if(!nodes.length){event.preventDefault();root.focus();}
      else if(event.shiftKey&&(document.activeElement===first||!nodes.includes(document.activeElement))){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&(document.activeElement===last||!nodes.includes(document.activeElement))){event.preventDefault();first.focus();}
    }
  };
  const focusin=event=>{if(top()&&!root.contains(event.target))focusFirst();};
  document.addEventListener('keydown',keydown,true);
  document.addEventListener('focusin',focusin);
  focusFirst();
  return ()=>{
    if(scope.closed)return;
    scope.closed=true;
    document.removeEventListener('keydown',keydown,true);
    document.removeEventListener('focusin',focusin);
    let returnFocus=null;
    while(scopes.at(-1)?.closed){
      const closing=scopes.pop();
      for(const [element,inert] of closing.inertStates)element.inert=inert;
      returnFocus=closing.previous;
    }
    if(visible(returnFocus))returnFocus.focus({preventScroll:true});
    else if(scopes.length){const current=scopes.at(-1).root;(focusable(current)[0]||current).focus({preventScroll:true});}
  };
}
