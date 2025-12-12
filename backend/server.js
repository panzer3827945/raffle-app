function getDeviceID(){
  let id = localStorage.getItem("device-id");
  if(!id){
    id = "dev-" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem("device-id", id);
  }
  return id;
}

/* reset-version 同步 */
(async function(){
  try{
    const res = await fetch("/api/reset-version", { cache: "no-store" });
    const data = await res.json();
    const localVer = localStorage.getItem("reset-version");

    if(localVer !== String(data.version)){
      localStorage.removeItem("used-limit");
      localStorage.setItem("reset-version", data.version);
      console.log("端末制限リセット");
    }
  }catch(e){}
})();
