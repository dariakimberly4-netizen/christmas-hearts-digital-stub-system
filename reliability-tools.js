(()=>{
  const issued=new Set();
  try{attendees.forEach(a=>{if(a?.code)issued.add(String(a.code))})}catch{}
  function safeMakeCode(){
    let code='';
    do{code=`CH-1203-${Math.floor(1000+Math.random()*9000)}`}while(issued.has(code)||(typeof attendees!=='undefined'&&attendees.some(a=>a.code===code)));
    issued.add(code);
    return code;
  }
  try{makeCode=safeMakeCode;window.makeCode=safeMakeCode}catch{}
})();
