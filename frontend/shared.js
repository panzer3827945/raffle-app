/* ===== 端末 ID（穩定版） ===== */
function getDeviceID(){
  let id = localStorage.getItem("device-id");
  if(!id){
    id = "dev-" + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem("device-id", id);
  }
  return id;
}

/* ===== 抽獎機率（70/20/10） ===== */
function drawPrize(){
  const r = Math.random() * 100;
  if (r < 70) return 1000;
  if (r < 90) return 500;
  return 100;
}

/* ===== 紀錄送出 ===== */
async function submitRecord(name, prize, mode){
  await fetch("/api/record", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      device: getDeviceID(),
      prize,
      mode
    })
  });
}

/* ===== reset-version 同步（關鍵） ===== */
(async function syncReset(){
  try{
    const res = await fetch("/api/reset-version", { cache: "no-store" });
    const data = await res.json();

    const localVer = localStorage.getItem("reset-version");
    if(localVer !== String(data.version)){
      localStorage.removeItem("used-limit");
      localStorage.setItem("reset-version", data.version);
      console.log("端末制限を解除しました");
    }
  }catch(e){}
})();
