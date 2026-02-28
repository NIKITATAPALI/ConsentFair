let bulkResults = [];

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("imageModal");
  const closeBtn = document.getElementById("closeModalBtn");
  closeBtn.addEventListener("click", () => { modal.style.display = "none"; });
  window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
});

document.getElementById("start-bulk").addEventListener("click", () => {
  const text = document.getElementById("bulk-urls").value;
  const urls = text.split("\n").map(u => u.trim()).filter(u => u.startsWith("http"));
  if (urls.length === 0) { alert("Please enter valid URLs"); return; }

  const customTimeout = parseInt(document.getElementById("timeout-val").value);

  document.getElementById("start-bulk").disabled = true;
  document.getElementById("start-bulk").textContent = "⚙️ Batch Scan Active...";
  bulkResults = [];
  document.getElementById("bulk-results-body").innerHTML = "";
  updateStats();
  
  // Send custom timeout along with URLs
  chrome.runtime.sendMessage({ 
    type: "START_BULK_SCAN", 
    urls: urls, 
    timeout: customTimeout 
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "BULK_ITEM_FINALIZED") addResultToTable(message.data);
  if (message.type === "BULK_SCAN_FINISHED") {
    document.getElementById("start-bulk").disabled = false;
    document.getElementById("start-bulk").textContent = "🚀 Start Batch Audit";
    alert("Batch audit completed!");
  }
});

function addResultToTable(data) {
  bulkResults.push(data);
  const tbody = document.getElementById("bulk-results-body");
  const row = document.createElement("tr");
  const patterns = data.issues.map(i => i.type).join(", ") || "None";
  
  const screenshotBtn = data.screenshot ? 
    `<button class="view-btn" style="background:#4a90d9; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; cursor:pointer;">🖼️ View</button>` : "N/A";

  row.innerHTML = `
    <td><strong>${data.hostname}</strong></td>
    <td style="color: ${data.tierColor}; font-weight: bold;">${data.score}</td>
    <td>${data.tierEmoji} ${data.tier}</td>
    <td style="font-size: 11px;">${patterns}</td>
    <td style="text-align:center">${data.cai || "N/A"}</td>
    <td style="text-align:center">${screenshotBtn}</td>
  `;
  
  const btn = row.querySelector(".view-btn");
  if (btn) {
    btn.addEventListener("click", () => {
      document.getElementById("modalImg").src = data.screenshot;
      document.getElementById("imageModal").style.display = "flex";
    });
  }

  tbody.prepend(row);
  updateStats();
  updateNativeChart();
}

function updateStats() {
  const count = bulkResults.length;
  const avg = count > 0 ? (bulkResults.reduce((s, r) => s + r.score, 0) / count).toFixed(1) : 0;
  document.getElementById("count-processed").textContent = count;
  document.getElementById("avg-score").textContent = avg;
}

function updateNativeChart() {
  const total = bulkResults.length;
  if (total === 0) return;
  const comp = bulkResults.filter(r => r.score >= 70).length;
  const part = bulkResults.filter(r => r.score >= 40 && r.score < 70).length;
  const non = bulkResults.filter(r => r.score < 40).length;
  document.getElementById("val-comp").textContent = comp;
  document.getElementById("val-part").textContent = part;
  document.getElementById("val-non").textContent = non;
  document.getElementById("bar-comp").style.width = `${(comp / total) * 100}%`;
  document.getElementById("bar-part").style.width = `${(part / total) * 100}%`;
  document.getElementById("bar-non").style.width = `${(non / total) * 100}%`;
}

document.getElementById("download-csv").addEventListener("click", () => {
  if (bulkResults.length === 0) return;
  let csv = "Hostname,URL,Score,Tier,Dark Patterns,CAI Score\n";
  bulkResults.forEach(r => {
    csv += `"${r.hostname}","${r.url}",${r.score},"${r.tier}","${r.issues.map(i => i.type).join("; ")}","${r.cai || "N/A"}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `ConsentFair_Research_Data.csv`; a.click();
});