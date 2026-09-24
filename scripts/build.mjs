import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const root=resolve(import.meta.dirname,".."),out=resolve(root,"dist");
const config=JSON.parse(await readFile(resolve(root,"site-config.json"),"utf8"));
const required=["legalName","tradeName","address","kvk","vatId","email","phone","siteUrl"];
const missing=required.filter(k=>!String(config[k]||"").trim());
if(config.launchReady&&(missing.length||!config.addressReviewComplete||!config.legalReviewComplete||!config.privacyReviewComplete))throw Error("Lancering geblokkeerd: vul bedrijfsgegevens in en rond adres-, privacy- en voorwaardencontrole af. Ontbrekend: "+missing.join(", "));
if(config.launchReady&&!/^https:\/\/[^/]+\/?$/.test(config.siteUrl))throw Error("siteUrl moet een HTTPS-domein zijn, zonder pad.");
const escape=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const values={...config,draftNotice:config.launchReady?"":'<p class="notice">Voorbereidingsversie: bedrijfsgegevens en afspraken worden vóór de commerciële lancering definitief gemaakt.</p>'};
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const names=["index.html","bedankt.html","intake.html","intake-ontvangen.html","admin.html","contact.html","privacy.html","voorwaarden.html","lancering.html","404.html","betaling-terug.html","admin.js","intake.js","lancering.js","legal.css","favicon.svg","luca-scalise.jpg","voorbeeld-werkplan.pdf"];
for(const name of names){
 if(name.endsWith(".html")){
 let html=await readFile(resolve(root,name),"utf8");
 html=html.replace(/\{\{(\w+)\}\}/g,(_,key)=>key==="draftNotice"?values[key]:escape(values[key]||"Nog niet vastgesteld"));
 if(!config.launchReady&&!/name="robots"/.test(html))html=html.replace("</head>",'<meta name="robots" content="noindex,nofollow"></head>');
 if(config.launchReady&&["index.html","contact.html","privacy.html","voorwaarden.html"].includes(name)){
 const canonical=config.siteUrl.replace(/\/$/,"")+(name==="index.html"?"/":"/"+name);
 html=html.replace("</head>",'<link rel="canonical" href="'+escape(canonical)+'"></head>');
 }
 await writeFile(resolve(out,name),html);
 }else await cp(resolve(root,name),resolve(out,name));
}
await writeFile(resolve(out,"robots.txt"),config.launchReady?"User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /.netlify/functions/\nDisallow: /lancering.html\nSitemap: "+config.siteUrl.replace(/\/$/,"")+"/sitemap.xml\n":"User-agent: *\nDisallow: /\n");
if(config.launchReady)await writeFile(resolve(out,"sitemap.xml"),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+["/","/contact.html","/privacy.html","/voorwaarden.html"].map(path=>"<url><loc>"+escape(config.siteUrl.replace(/\/$/,"")+path)+"</loc></url>").join("")+"</urlset>");
console.log("v6 gebouwd: "+(config.launchReady?"lancering":"voorbereiding (niet geïndexeerd)"));
