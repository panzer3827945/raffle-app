/* =====================================================
 * shared.js（最終穩定版）
 * ===================================================== */

/* ===== 裝置 ID（唯一，可被 reset 清除）===== */
function getDeviceID(){
  let id = localStorage.getItem("deviceId");
  if(!id){
    id = crypto.randomUUID();
    localStorage.setItem("deviceId", id);
  }
  return id;
}

/* ===== resetVersion 同步（全設備統一）===== */
async function syncResetVersion(){
  try{
    const res = await fetch("/api/reset-version", { cache: "no-store" });
    if(!res.ok) return;

    const data = await res.json();
    const serverVer = String(data.resetVersion);
    const localVer = localStorage.getItem("resetVersion");

    if(localVer !== serverVer){
      // 🔥 清掉所有會影響抽獎的本機狀態
      localStorage.removeItem("used-limit");
      localStorage.removeItem("played");
      localStorage.removeItem("deviceId");

      localStorage.setItem("resetVersion", serverVer);
      console.log("[reset synced]", serverVer);
    }
  }catch(e){
    console.warn("reset sync failed");
  }
}

/* ===== 抽獎紀錄送出（一定要 await）===== */
async function submitRecord(name, prize, mode){
  const device = getDeviceID();

  try{
    const res = await fetch("/api/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        prize,
        mode,
        device
      })
    });

    if(!res.ok){
      console.error("record failed");
    }
  }catch(e){
    console.error("record error", e);
  }
}
