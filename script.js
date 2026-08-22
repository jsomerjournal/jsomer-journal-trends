"use strict";

const fmt = (value) => new Intl.NumberFormat("en-US").format(Number(value) || 0);
const dec = (value) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const byId = (id) => document.getElementById(id);
const setText = (id, value) => { const el = byId(id); if (el) el.textContent = value; };
const setHTML = (id, html) => { const el = byId(id); if (el) el.innerHTML = html; };

function columnChart(items, label, value) {
  const rows = Array.isArray(items) ? items : [];
  const max = Math.max(...rows.map((item) => Number(item[value]) || 0), 1);
  return rows.map((item) => `<div class="column-item"><span class="column-value">${fmt(item[value])}</span><div class="column-bar" style="height:${Math.max(3, 100 * (Number(item[value]) || 0) / max)}%"></div><span class="column-label">${esc(item[label])}</span></div>`).join("");
}

function slimBars(items, label, value) {
  const rows = Array.isArray(items) ? items : [];
  const max = Math.max(...rows.map((item) => Number(item[value]) || 0), 1);
  return rows.map((item) => `<div class="bar-row"><span>${esc(item[label])}</span><div class="bar-track"><div class="bar-fill" style="width:${100 * (Number(item[value]) || 0) / max}%"></div></div><strong class="bar-value">${fmt(item[value])}</strong></div>`).join("");
}

function articleList(items, mode) {
  const rows = Array.isArray(items) ? items : [];
  return rows.map((item) => {
    const title = item.title || "Untitled article";
    const url = item.url || (item.doi ? `https://doi.org/${item.doi}` : "#");
    let meta = "";
    if (mode === "wos") meta = `${item.year || ""} · ${fmt(item.citations)} WoS citation${Number(item.citations) === 1 ? "" : "s"}`;
    if (mode === "views") meta = `${esc(item.issue || "")} · ${fmt(item.views)} views`;
    if (mode === "downloads") meta = `${esc(item.issue || "")} · ${fmt(item.downloads)} PDF file requests`;
    if (mode === "scopus") meta = `${item.year || ""} · ${fmt(item.citations)} citations`;
    return `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span class="article-title">${esc(title)}</span></a><span class="meta">${meta}</span></li>`;
  }).join("");
}

function areaChart(timeline) {
  const t = timeline || { labels: [], views: [], downloads: [] };
  const W = 1000, H = 280, p = 28;
  const max = Math.max(...(t.views || []), ...(t.downloads || []), 1);
  const points = (values) => (values || []).map((value, index) => `${p + index * (W - 2 * p) / Math.max(values.length - 1, 1)},${H - p - value * (H - 2 * p) / max}`).join(" ");
  const viewPoints = points(t.views || []), downloadPoints = points(t.downloads || []);
  const labels = (t.labels || []).map((label, index) => index % 3 === 0 ? `<text x="${p + index * (W - 2 * p) / Math.max(t.labels.length - 1, 1)}" y="275" text-anchor="middle" font-size="9" fill="#788690">${esc(label)}</text>` : "").join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Monthly views and PDF file requests"><defs><linearGradient id="viewFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#176b87" stop-opacity=".28"/><stop offset="1" stop-color="#176b87" stop-opacity="0"/></linearGradient></defs><polygon points="${p},${H-p} ${viewPoints} ${W-p},${H-p}" fill="url(#viewFill)"/><polyline points="${viewPoints}" fill="none" stroke="#176b87" stroke-width="4" vector-effect="non-scaling-stroke"/><polyline points="${downloadPoints}" fill="none" stroke="#d9a441" stroke-width="3" vector-effect="non-scaling-stroke"/>${labels}</svg>`;
}

function render(data) {
  const w = data.wos, s = data.scopus, p = data.peerReview, g = data.geography;
  setText("updated", `Data updated ${data.meta.dataUpdated} · Coverage: ${data.meta.coverage}`);
  setText("footerDate", `Updated ${data.meta.dataUpdated}`);
  [["heroCitations",w.citationLinks],["heroCitingDocs",w.uniqueCitingDocuments],["heroCitedArticles",w.citedJsomerArticles],["heroCitingJournals",w.citingSourceJournals],["heroCitingCountries",w.countriesRegions],["wosTotalCitations",w.citationLinks],["wosCitedArticles",w.citedJsomerArticles],["scopusTotalCitations",s.citationLinks],["scopusCitedArticles",s.citedJsomerArticles]].forEach(([id,value]) => setText(id,fmt(value)));
  setText("wosAvgPublished",dec(w.averageCitationsPerPublishedArticle)); setText("wosAvgCited",dec(w.averageCitationsPerCitedArticle));
  setText("scopusAvgPublished",dec(s.averageCitationsPerPublishedArticle)); setText("scopusAvgCited",dec(s.averageCitationsPerCitedArticle));
  setHTML("primaryStats", [["Published articles",data.summary.articlesPublished],["WoS citation links",w.citationLinks],["Article views",data.summary.articleViews],["PDF file requests",data.summary.pdfDownloads]].map(([label,value]) => `<div class="stat"><strong>${fmt(value)}</strong><span>${esc(label)}</span></div>`).join(""));
  setHTML("secondaryStats", [["Issues",data.summary.issuesPublished],["Contributing authors",data.summary.contributingAuthors],["Countries represented",data.summary.countriesRepresented],["International collaborations",data.summary.internationalCollaborationArticles]].map(([label,value]) => `<span><strong>${fmt(value)}</strong>${esc(label)}</span>`).join(""));
  setHTML("wosYearColumns",columnChart(w.citingDocumentsByYear,"year","documents")); setHTML("wosAreaChart",slimBars(w.researchAreas,"area","documents")); setHTML("wosSourceChart",slimBars(w.topCitingSources,"source","documents"));
  setHTML("wosTopArticles",articleList(w.mostCitedArticles,"wos"));
  setHTML("wosIndexes",(w.indexes || []).map((item) => `<span class="index-badge">${esc(item.index)} · ${fmt(item.documents)}</span>`).join("")); setText("wosNote",w.methodNote);
  setHTML("scopusYearColumns",columnChart(s.citingDocumentsByYear,"year","documents")); setHTML("scopusTypeChart",slimBars(s.documentTypes,"type","documents")); setHTML("scopusSourceChart",slimBars(s.topCitingSources,"source","documents")); setHTML("scopusTopArticles",articleList(s.mostCitedArticles,"scopus")); setText("scopusNote",s.methodNote);
  const renderScopus = (rows) => setHTML("scopusCitingTable",rows.map((item) => `<tr><td>${item.year}</td><td><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.title)}</a><small>${esc(item.authors)}</small></td><td>${esc(item.source)}</td><td>${esc(item.documentType)}</td><td><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Open</a></td></tr>`).join(""));
  renderScopus(s.citingDocuments || []); const search = byId("scopusSearch"); if (search) search.addEventListener("input",(event) => { const q=event.target.value.toLowerCase(); renderScopus((s.citingDocuments || []).filter((item) => [item.title,item.authors,item.source,item.year].join(" ").toLowerCase().includes(q))); });
  setHTML("yearColumns",columnChart(data.publicationByYear,"year","articles"));
  const colors=["#176b87","#2aa6a4","#d9a441","#7996a5","#b5c8ce"], total=(data.articleTypes || []).reduce((sum,item)=>sum+item.count,0); let start=0,gradient=[];
  (data.articleTypes || []).forEach((item,index)=>{const end=start+100*item.count/Math.max(total,1);gradient.push(`${colors[index%colors.length]} ${start}% ${end}%`);start=end;}); if(byId("typeDonut")) byId("typeDonut").style.background=`conic-gradient(${gradient.join(",")})`;
  setHTML("typeLegend",(data.articleTypes || []).map((item,index)=>`<div class="legend-item" style="--c:${colors[index%colors.length]}"><span>${esc(item.label)}</span><strong>${fmt(item.count)}</strong></div>`).join("")); setHTML("countryChart",slimBars(data.countries,"country","authors"));
  setText("collabRate",`${data.summary.internationalCollaborationRate}%`); setText("collabText",`${data.summary.internationalCollaborationArticles} of ${data.summary.articlesPublished} published articles include authors affiliated with more than one country.`);
  const geoColors=["#176b87","#2aa6a4","#d9a441","#7996a5","#9b7bb5","#d17b5f"]; let position=0, geoGradient=[]; (g.authorsByContinent || []).forEach((item,index)=>{let end=position+item.percentage;geoGradient.push(`${geoColors[index]} ${position}% ${end}%`);position=end;}); if(byId("authorContinentDonut"))byId("authorContinentDonut").style.background=`conic-gradient(${geoGradient.join(",")})`;
  setText("authorContinentTotal",fmt(g.authorTotal)); setHTML("authorContinentLegend",(g.authorsByContinent || []).map((item,index)=>`<div><span><i style="background:${geoColors[index]}"></i>${esc(item.continent)}</span><strong>${fmt(item.authors)} <small>${item.percentage}%</small></strong></div>`).join(""));
  const maxVisitors=Math.max(...(g.visitorsByContinent || []).map(item=>item.visitors),1); setHTML("visitorContinentBars",(g.visitorsByContinent || []).map((item,index)=>`<div class="continent-bar-row"><div><strong>${esc(item.continent)}</strong><span>${fmt(item.visitors)} · ${item.percentage}%</span></div><div class="continent-track"><div style="width:${100*item.visitors/maxVisitors}%;background:${geoColors[index]}"></div></div></div>`).join(""));
  setText("visitorContinentTotal",fmt(g.visitorTotalWithReportedCounts)); setText("visitorCountryTotal",fmt(g.visitorCountriesListed)); setText("geographyNote",g.classificationNote);
  setHTML("timeline",areaChart(data.monthlyEngagement)); setHTML("topViewed",articleList(data.topViewed,"views")); setHTML("topDownloaded",articleList(data.topDownloaded,"downloads"));
  setHTML("peerCards",[["Manuscripts entering peer review",p.manuscriptsEnteringPeerReview],["Reviewers invited",p.reviewersInvited],["Completed review reports",p.completedReports],["Median invitation-to-completion",`${p.medianInvitationToCompletionDays} days`]].map(([label,value])=>`<div class="review-card"><strong>${typeof value === "number" ? fmt(value) : esc(value)}</strong><span>${esc(label)}</span></div>`).join(""));
  const maxInvitations=Math.max(...(p.annualActivity || []).map(item=>item.invitations),1); setHTML("peerYearChart",(p.annualActivity || []).map(item=>`<div class="review-row"><strong>${item.year}</strong><div class="review-bars"><div class="review-track"><div class="review-fill invited" style="width:${100*item.invitations/maxInvitations}%"></div></div><div class="review-track"><div class="review-fill completed" style="width:${100*item.completed/maxInvitations}%"></div></div></div><span class="review-values">${item.invitations} / ${item.completed}</span></div>`).join("")); setText("within21",`${p.completedWithin21DaysPct}%`); setText("byDeadline",`${p.completedByDeadlinePct}%`);
  setHTML("modelGrid",(data.publishingModel || []).map(item=>`<div class="principle">${esc(item)}</div>`).join(""));
}

fetch(`data/journal-data.json?v=20260822-2`, { cache: "no-store" })
  .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then(render)
  .catch((error) => { console.error(error); const warning=document.createElement("div"); warning.className="data-error"; warning.textContent="Dashboard data could not be loaded. Please refresh the page."; document.body.appendChild(warning); });

const menu=document.querySelector(".menu-button"), links=byId("navLinks"); if(menu && links){menu.addEventListener("click",()=>{const open=links.classList.toggle("open");menu.setAttribute("aria-expanded",String(open));});links.addEventListener("click",()=>{links.classList.remove("open");menu.setAttribute("aria-expanded","false");});}
