import{M as Ht,a as Et,b as rt}from"./constants-Co0jPVN_.js";import{c as Pt,g as Wt}from"./_commonjsHelpers-Cpj98o6Y.js";const Tt={bizbox_alpha:{urlPatterns:[/icube\./i,/douzone\./i,/bizbox\./i,/biz-box\./i],domSignatures:["#icubeWrap",".bizbox-wrap","[data-bizbox]","#douzone-app"]},hiworks:{urlPatterns:[/hiworks\./i,/office\.hiworks\./i],domSignatures:["#hiworks-app",".hiworks-container","[data-hiworks]",".hw-wrap"]},daou_office:{urlPatterns:[/daouoffice\./i,/daoums\./i,/daou\./i],domSignatures:["#daouoffice-app",".daou-wrap","[data-daou]",".daoums-container"]},flow:{urlPatterns:[/flow\.team/i,/flowteam\./i],domSignatures:["#flow-app",".flow-container","[data-flow]",".flow-wrap"]},amaranth10:{urlPatterns:[/amaranth/i,/wehago\./i],domSignatures:["#amaranth-app",".amaranth-wrap","[data-amaranth]",".wehago-container","#wehago-app"]}};function qt(){var d,f,v;const o=window.location.href;if(window.location.hostname==="localhost"||window.location.hostname==="127.0.0.1"){const x=(d=document.body)==null?void 0:d.getAttribute("data-groupware"),h=(f=document.documentElement)==null?void 0:f.getAttribute("data-groupware"),g=x||h;if(g){const c=g.toLowerCase().trim();if(["bizbox_alpha","hiworks","daou_office","flow","amaranth10"].includes(c))return c}}for(const[x,h]of Object.entries(Tt))for(const g of h.urlPatterns)if(g.test(o))return x;for(const[x,h]of Object.entries(Tt))for(const g of h.domSignatures)try{if(document.querySelector(g))return x}catch{}const s=((v=document.querySelector('meta[property="og:title"]'))==null?void 0:v.getAttribute("content"))||"";if(/bizbox|비즈박스/i.test(s))return"bizbox_alpha";if(/hiworks|하이웍스/i.test(s))return"hiworks";if(/daou|다우/i.test(s))return"daou_office";if(/flow/i.test(s))return"flow";if(/amaranth|아마란스|wehago/i.test(s))return"amaranth10";const p=document.title||"";return/bizbox|비즈박스|전자결재.*duzon|duzon.*전자결재/i.test(p)?"bizbox_alpha":"unknown"}function Ft(o,s=Ht){function p(d,f){if(f>=s)return d.tagName.toLowerCase();const v=d.tagName.toLowerCase(),x=Array.from(d.children);if(x.length===0)return v;const h=x.map(g=>p(g,f+1));return`${v}>${h.join(",")}`}return p(o,0)}async function Dt(o){const p=new TextEncoder().encode(o),d=await crypto.subtle.digest("SHA-256",p);return Array.from(new Uint8Array(d)).map(v=>v.toString(16).padStart(2,"0")).join("")}const jt=["#divFormBind",".div_form_bind","#icubeWrap .content-area","#icubeWrap",".bizbox-content","#docForm","#formView",".gw-form-content",".doc-form-wrap",".approval-content","#approval-content","#docView","#doc-view",".doc-content","#docContent","[data-approval]","[data-approval-doc]",".approval-view",".approval-wrap","#approval-view",".document-view","#document-view",".doc-view-wrap",".content-wrapper","#contentWrap","#ea-doc-content",".ea-doc-view","#eaDocContent","article","main","form"];function Bt(){for(const d of jt)try{const f=document.querySelector(d);if(f&&f.innerHTML.trim().length>50)return f}catch{}const o=document.querySelectorAll('div[class*="content"], div[class*="doc"], div[class*="view"], div[class*="approval"]');let s=null,p=0;return o.forEach(d=>{const f=(d.textContent||"").trim().length;f>p&&f>100&&(p=f,s=d)}),s||(document.body&&(document.body.textContent||"").trim().length>100?document.body:null)}async function Gt(){const o=Bt();if(!o)return null;const s=Ft(o),p=await Dt(s);let d=o.outerHTML;return d.length>Et&&(d=d.slice(0,Et)),{skeleton:s,hash:p,domHtml:d}}function D(o){var s;if(!o)return"";try{const p=document.querySelector(o);return((s=p==null?void 0:p.textContent)==null?void 0:s.trim())||""}catch{return""}}const Mt=[["미결재","pending"],["미결","pending"],["승인","approved"],["결재","approved"],["완료","approved"],["합의","approved"],["전결","approved"],["반려","rejected"],["거부","rejected"],["대기","pending"],["진행","pending"],["예정","pending"],["approved","approved"],["rejected","rejected"],["pending","pending"]];function st(o){const s=o.trim().toLowerCase();for(const[p,d]of Mt)if(s.includes(p))return d;return"pending"}function Xt(o){if(!o)return[];let s=null;try{s=document.querySelector(o)}catch{return[]}if(!s)return[];const p=[],d=s.querySelectorAll("tr");if(d.length>0){const h=d[0],c=h.querySelector("th")!==null||(h.textContent||"").includes("결재자")||(h.textContent||"").includes("직위")||(h.textContent||"").includes("이름")?1:0;for(let i=c;i<d.length;i++){const t=d[i].querySelectorAll("td, th");if(t.length===0)continue;const e=Array.from(t).map(u=>{var l;return((l=u.textContent)==null?void 0:l.trim())||""});let n="",a="",r="";e.length>=3?e[0].length<=10&&!e[0].match(/[가-힣]{2,4}$/)?(a=e[0],n=e[1],r=e[2]):(n=e[0],a=e[1],r=e[2]):e.length===2?(n=e[0],r=e[1]):e.length===1&&(n=e[0]),n&&p.push({name:n,position:a,status:st(r)})}if(p.length>0)return p}const f=s.querySelectorAll("li");if(f.length>0&&(f.forEach(h=>{var i;const g=((i=h.textContent)==null?void 0:i.trim())||"";if(!g)return;const c=g.split(/[|/\-·]/).map(t=>t.trim());c.length>=2?p.push({name:c[0],position:c.length>=3?c[1]:"",status:st(c[c.length-1])}):p.push({name:g,position:"",status:"pending"})}),p.length>0))return p;const v=[":scope > div > div",":scope .approval-card",":scope .approver",':scope [class*="card"]',':scope [class*="step"]',':scope [class*="approver"]',':scope [class*="signer"]'];for(const h of v)try{const g=s.querySelectorAll(h);if(g.length>=2&&(g.forEach(c=>{var a;const i=((a=c.textContent)==null?void 0:a.trim())||"";if(!i||i.length>200)return;const t=i.match(/([가-힣]{2,4})(?:\s|$)/),e=i.match(/(과장|부장|팀장|대리|사원|차장|상무|전무|이사|대표|실장|본부장|센터장|매니저|주임)/);let n="";for(const[r]of Mt)if(i.includes(r)){n=r;break}t&&p.push({name:t[1],position:e?e[1]:"",status:st(n)})}),p.length>0))return p}catch{}return s.querySelectorAll(":scope > div, :scope > span").forEach(h=>{var c;const g=((c=h.textContent)==null?void 0:c.trim())||"";g&&g.length>1&&g.length<100&&p.push({name:g,position:"",status:"pending"})}),p}function Ut(o){const s=o.toLowerCase();return/\.pdf$/i.test(s)?"pdf":/\.(xlsx?|csv)$/i.test(s)?"excel":/\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(s)?"image":/^https?:\/\//i.test(s)?"link":"other"}function Jt(){const o=[".daou-file-list li",".attach-list li",".attachment-list li",".file-list li",'[class*="attach"] li','[class*="file"] a',".doc_attach li",".doc-attach li"],s=[],p=new Set;for(const d of o)try{const f=document.querySelectorAll(d);if(f.length===0)continue;if(f.forEach(v=>{var i;const x=v.querySelector("a"),h=((x==null?void 0:x.textContent)||v.textContent||"").trim();if(!h||h.length<2||p.has(h))return;p.add(h);const g=v.querySelector('[class*="size"]'),c=((i=g==null?void 0:g.textContent)==null?void 0:i.trim())||"";s.push({name:h,size:c,type:Ut(h),url:(x==null?void 0:x.href)||void 0})}),s.length>0)break}catch{}return s}function Yt(o){let f=null;try{f=o?document.querySelector(o):null}catch{}f||(f=document.body);const v=f.querySelectorAll("img"),x=[];for(const h of v){if(x.length>=5)break;if(!(!h.complete||h.naturalWidth<50||h.naturalHeight<50))try{const g=document.createElement("canvas");let c=h.naturalWidth,i=h.naturalHeight;c>1024&&(i=Math.round(i*(1024/c)),c=1024),g.width=c,g.height=i;const t=g.getContext("2d");if(!t)continue;t.drawImage(h,0,0,c,i);const e=g.toDataURL("image/jpeg",.85);e.length>1e3&&x.push(e)}catch{}}return x}function Vt(o){let d=null;try{d=o?document.querySelector(o):null}catch{}d||(d=document.body);const f=d.querySelectorAll("table");if(f.length===0)return"";const v=[];let x=0;for(let h=0;h<f.length&&h<5;h++){const g=f[h].querySelectorAll("tr");if(g.length===0)continue;const c=[];let i=0;for(let e=0;e<g.length;e++){const n=g[e].querySelectorAll("td, th");if(n.length===0)continue;const a=Array.from(n).map(u=>{var l;return(((l=u.textContent)==null?void 0:l.trim())||"").replace(/\|/g,"\\|").replace(/\n/g," ")}),r="| "+a.join(" | ")+" |";c.push(r),e===0&&(i=a.length,c.push("|"+" --- |".repeat(i)))}if(c.length<=1)continue;const t=c.join(`
`);if(x+t.length>4e3)break;v.push(t),x+=t.length}return v.join(`

`)}const Kt=["#divFormBind",".div_form_bind","#icubeWrap .content-area","#icubeWrap",".bizbox-content","#docForm","#formView",".gw-form-content",".doc-form-wrap",".approval-content","#approval-content","#docView","#doc-view",".doc-content","#docContent","#ea-doc-content",".ea-doc-view","#eaDocContent","article","main","form"];function Zt(){for(const d of Kt)try{const f=document.querySelector(d);if(f&&(f.textContent||"").trim().length>50)return(f.innerText||f.textContent||"").trim().slice(0,rt)}catch{}const o=document.querySelectorAll('div[class*="content"], div[class*="doc"], div[class*="view"], div[class*="approval"]');let s=null,p=0;if(o.forEach(d=>{const f=(d.textContent||"").trim().length;f>p&&f>100&&(p=f,s=d)}),s!==null){const d=s;return(d.innerText||d.textContent||"").trim().slice(0,rt)}return document.body?(document.body.innerText||document.body.textContent||"").trim().slice(0,rt):""}function Qt(o,s){return{doc_type:D(o.doc_type),subject:D(o.subject),body:D(o.body),requester_name:D(o.requester_name),requester_dept:D(o.requester_dept),approval_line:Xt(o.approval_line),created_at:D(o.created_at),groupware:s,attachments:Jt(),bodyImages:Yt(o.body),tableMarkdown:Vt(o.body)}}var Nt={exports:{}};/*!***************************************************
* mark.js v8.11.1
* https://markjs.io/
* Copyright (c) 2014–2018, Julian Kühnel
* Released under the MIT license https://git.io/vwTVl
*****************************************************/(function(o,s){(function(p,d){o.exports=d()})(Pt,function(){var p=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(c){return typeof c}:function(c){return c&&typeof Symbol=="function"&&c.constructor===Symbol&&c!==Symbol.prototype?"symbol":typeof c},d=function(c,i){if(!(c instanceof i))throw new TypeError("Cannot call a class as a function")},f=function(){function c(i,t){for(var e=0;e<t.length;e++){var n=t[e];n.enumerable=n.enumerable||!1,n.configurable=!0,"value"in n&&(n.writable=!0),Object.defineProperty(i,n.key,n)}}return function(i,t,e){return t&&c(i.prototype,t),e&&c(i,e),i}}(),v=Object.assign||function(c){for(var i=1;i<arguments.length;i++){var t=arguments[i];for(var e in t)Object.prototype.hasOwnProperty.call(t,e)&&(c[e]=t[e])}return c},x=function(){function c(i){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!0,e=arguments.length>2&&arguments[2]!==void 0?arguments[2]:[],n=arguments.length>3&&arguments[3]!==void 0?arguments[3]:5e3;d(this,c),this.ctx=i,this.iframes=t,this.exclude=e,this.iframesTimeout=n}return f(c,[{key:"getContexts",value:function(){var t=void 0,e=[];return typeof this.ctx>"u"||!this.ctx?t=[]:NodeList.prototype.isPrototypeOf(this.ctx)?t=Array.prototype.slice.call(this.ctx):Array.isArray(this.ctx)?t=this.ctx:typeof this.ctx=="string"?t=Array.prototype.slice.call(document.querySelectorAll(this.ctx)):t=[this.ctx],t.forEach(function(n){var a=e.filter(function(r){return r.contains(n)}).length>0;e.indexOf(n)===-1&&!a&&e.push(n)}),e}},{key:"getIframeContents",value:function(t,e){var n=arguments.length>2&&arguments[2]!==void 0?arguments[2]:function(){},a=void 0;try{var r=t.contentWindow;if(a=r.document,!r||!a)throw new Error("iframe inaccessible")}catch{n()}a&&e(a)}},{key:"isIframeBlank",value:function(t){var e="about:blank",n=t.getAttribute("src").trim(),a=t.contentWindow.location.href;return a===e&&n!==e&&n}},{key:"observeIframeLoad",value:function(t,e,n){var a=this,r=!1,u=null,l=function m(){if(!r){r=!0,clearTimeout(u);try{a.isIframeBlank(t)||(t.removeEventListener("load",m),a.getIframeContents(t,e,n))}catch{n()}}};t.addEventListener("load",l),u=setTimeout(l,this.iframesTimeout)}},{key:"onIframeReady",value:function(t,e,n){try{t.contentWindow.document.readyState==="complete"?this.isIframeBlank(t)?this.observeIframeLoad(t,e,n):this.getIframeContents(t,e,n):this.observeIframeLoad(t,e,n)}catch{n()}}},{key:"waitForIframes",value:function(t,e){var n=this,a=0;this.forEachIframe(t,function(){return!0},function(r){a++,n.waitForIframes(r.querySelector("html"),function(){--a||e()})},function(r){r||e()})}},{key:"forEachIframe",value:function(t,e,n){var a=this,r=arguments.length>3&&arguments[3]!==void 0?arguments[3]:function(){},u=t.querySelectorAll("iframe"),l=u.length,m=0;u=Array.prototype.slice.call(u);var b=function(){--l<=0&&r(m)};l||b(),u.forEach(function(y){c.matches(y,a.exclude)?b():a.onIframeReady(y,function(S){e(y)&&(m++,n(S)),b()},b)})}},{key:"createIterator",value:function(t,e,n){return document.createNodeIterator(t,e,n,!1)}},{key:"createInstanceOnIframe",value:function(t){return new c(t.querySelector("html"),this.iframes)}},{key:"compareNodeIframe",value:function(t,e,n){var a=t.compareDocumentPosition(n),r=Node.DOCUMENT_POSITION_PRECEDING;if(a&r)if(e!==null){var u=e.compareDocumentPosition(n),l=Node.DOCUMENT_POSITION_FOLLOWING;if(u&l)return!0}else return!0;return!1}},{key:"getIteratorNode",value:function(t){var e=t.previousNode(),n=void 0;return e===null?n=t.nextNode():n=t.nextNode()&&t.nextNode(),{prevNode:e,node:n}}},{key:"checkIframeFilter",value:function(t,e,n,a){var r=!1,u=!1;return a.forEach(function(l,m){l.val===n&&(r=m,u=l.handled)}),this.compareNodeIframe(t,e,n)?(r===!1&&!u?a.push({val:n,handled:!0}):r!==!1&&!u&&(a[r].handled=!0),!0):(r===!1&&a.push({val:n,handled:!1}),!1)}},{key:"handleOpenIframes",value:function(t,e,n,a){var r=this;t.forEach(function(u){u.handled||r.getIframeContents(u.val,function(l){r.createInstanceOnIframe(l).forEachNode(e,n,a)})})}},{key:"iterateThroughNodes",value:function(t,e,n,a,r){for(var u=this,l=this.createIterator(e,t,a),m=[],b=[],y=void 0,S=void 0,k=function(){var A=u.getIteratorNode(l);return S=A.prevNode,y=A.node,y};k();)this.iframes&&this.forEachIframe(e,function(T){return u.checkIframeFilter(y,S,T,m)},function(T){u.createInstanceOnIframe(T).forEachNode(t,function(A){return b.push(A)},a)}),b.push(y);b.forEach(function(T){n(T)}),this.iframes&&this.handleOpenIframes(m,t,n,a),r()}},{key:"forEachNode",value:function(t,e,n){var a=this,r=arguments.length>3&&arguments[3]!==void 0?arguments[3]:function(){},u=this.getContexts(),l=u.length;l||r(),u.forEach(function(m){var b=function(){a.iterateThroughNodes(t,m,e,n,function(){--l<=0&&r()})};a.iframes?a.waitForIframes(m,b):b()})}}],[{key:"matches",value:function(t,e){var n=typeof e=="string"?[e]:e,a=t.matches||t.matchesSelector||t.msMatchesSelector||t.mozMatchesSelector||t.oMatchesSelector||t.webkitMatchesSelector;if(a){var r=!1;return n.every(function(u){return a.call(t,u)?(r=!0,!1):!0}),r}else return!1}}]),c}(),h=function(){function c(i){d(this,c),this.ctx=i,this.ie=!1;var t=window.navigator.userAgent;(t.indexOf("MSIE")>-1||t.indexOf("Trident")>-1)&&(this.ie=!0)}return f(c,[{key:"log",value:function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:"debug",n=this.opt.log;this.opt.debug&&(typeof n>"u"?"undefined":p(n))==="object"&&typeof n[e]=="function"&&n[e]("mark.js: "+t)}},{key:"escapeStr",value:function(t){return t.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,"\\$&")}},{key:"createRegExp",value:function(t){return this.opt.wildcards!=="disabled"&&(t=this.setupWildcardsRegExp(t)),t=this.escapeStr(t),Object.keys(this.opt.synonyms).length&&(t=this.createSynonymsRegExp(t)),(this.opt.ignoreJoiners||this.opt.ignorePunctuation.length)&&(t=this.setupIgnoreJoinersRegExp(t)),this.opt.diacritics&&(t=this.createDiacriticsRegExp(t)),t=this.createMergedBlanksRegExp(t),(this.opt.ignoreJoiners||this.opt.ignorePunctuation.length)&&(t=this.createJoinersRegExp(t)),this.opt.wildcards!=="disabled"&&(t=this.createWildcardsRegExp(t)),t=this.createAccuracyRegExp(t),t}},{key:"createSynonymsRegExp",value:function(t){var e=this.opt.synonyms,n=this.opt.caseSensitive?"":"i",a=this.opt.ignoreJoiners||this.opt.ignorePunctuation.length?"\0":"";for(var r in e)if(e.hasOwnProperty(r)){var u=e[r],l=this.opt.wildcards!=="disabled"?this.setupWildcardsRegExp(r):this.escapeStr(r),m=this.opt.wildcards!=="disabled"?this.setupWildcardsRegExp(u):this.escapeStr(u);l!==""&&m!==""&&(t=t.replace(new RegExp("("+this.escapeStr(l)+"|"+this.escapeStr(m)+")","gm"+n),a+("("+this.processSynomyms(l)+"|")+(this.processSynomyms(m)+")")+a))}return t}},{key:"processSynomyms",value:function(t){return(this.opt.ignoreJoiners||this.opt.ignorePunctuation.length)&&(t=this.setupIgnoreJoinersRegExp(t)),t}},{key:"setupWildcardsRegExp",value:function(t){return t=t.replace(/(?:\\)*\?/g,function(e){return e.charAt(0)==="\\"?"?":""}),t.replace(/(?:\\)*\*/g,function(e){return e.charAt(0)==="\\"?"*":""})}},{key:"createWildcardsRegExp",value:function(t){var e=this.opt.wildcards==="withSpaces";return t.replace(/\u0001/g,e?"[\\S\\s]?":"\\S?").replace(/\u0002/g,e?"[\\S\\s]*?":"\\S*")}},{key:"setupIgnoreJoinersRegExp",value:function(t){return t.replace(/[^(|)\\]/g,function(e,n,a){var r=a.charAt(n+1);return/[(|)\\]/.test(r)||r===""?e:e+"\0"})}},{key:"createJoinersRegExp",value:function(t){var e=[],n=this.opt.ignorePunctuation;return Array.isArray(n)&&n.length&&e.push(this.escapeStr(n.join(""))),this.opt.ignoreJoiners&&e.push("\\u00ad\\u200b\\u200c\\u200d"),e.length?t.split(/\u0000+/).join("["+e.join("")+"]*"):t}},{key:"createDiacriticsRegExp",value:function(t){var e=this.opt.caseSensitive?"":"i",n=this.opt.caseSensitive?["aàáảãạăằắẳẵặâầấẩẫậäåāą","AÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÄÅĀĄ","cçćč","CÇĆČ","dđď","DĐĎ","eèéẻẽẹêềếểễệëěēę","EÈÉẺẼẸÊỀẾỂỄỆËĚĒĘ","iìíỉĩịîïī","IÌÍỈĨỊÎÏĪ","lł","LŁ","nñňń","NÑŇŃ","oòóỏõọôồốổỗộơởỡớờợöøō","OÒÓỎÕỌÔỒỐỔỖỘƠỞỠỚỜỢÖØŌ","rř","RŘ","sšśșş","SŠŚȘŞ","tťțţ","TŤȚŢ","uùúủũụưừứửữựûüůū","UÙÚỦŨỤƯỪỨỬỮỰÛÜŮŪ","yýỳỷỹỵÿ","YÝỲỶỸỴŸ","zžżź","ZŽŻŹ"]:["aàáảãạăằắẳẵặâầấẩẫậäåāąAÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÄÅĀĄ","cçćčCÇĆČ","dđďDĐĎ","eèéẻẽẹêềếểễệëěēęEÈÉẺẼẸÊỀẾỂỄỆËĚĒĘ","iìíỉĩịîïīIÌÍỈĨỊÎÏĪ","lłLŁ","nñňńNÑŇŃ","oòóỏõọôồốổỗộơởỡớờợöøōOÒÓỎÕỌÔỒỐỔỖỘƠỞỠỚỜỢÖØŌ","rřRŘ","sšśșşSŠŚȘŞ","tťțţTŤȚŢ","uùúủũụưừứửữựûüůūUÙÚỦŨỤƯỪỨỬỮỰÛÜŮŪ","yýỳỷỹỵÿYÝỲỶỸỴŸ","zžżźZŽŻŹ"],a=[];return t.split("").forEach(function(r){n.every(function(u){if(u.indexOf(r)!==-1){if(a.indexOf(u)>-1)return!1;t=t.replace(new RegExp("["+u+"]","gm"+e),"["+u+"]"),a.push(u)}return!0})}),t}},{key:"createMergedBlanksRegExp",value:function(t){return t.replace(/[\s]+/gmi,"[\\s]+")}},{key:"createAccuracyRegExp",value:function(t){var e=this,n="!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~¡¿",a=this.opt.accuracy,r=typeof a=="string"?a:a.value,u=typeof a=="string"?[]:a.limiters,l="";switch(u.forEach(function(m){l+="|"+e.escapeStr(m)}),r){case"partially":default:return"()("+t+")";case"complementary":return l="\\s"+(l||this.escapeStr(n)),"()([^"+l+"]*"+t+"[^"+l+"]*)";case"exactly":return"(^|\\s"+l+")("+t+")(?=$|\\s"+l+")"}}},{key:"getSeparatedKeywords",value:function(t){var e=this,n=[];return t.forEach(function(a){e.opt.separateWordSearch?a.split(" ").forEach(function(r){r.trim()&&n.indexOf(r)===-1&&n.push(r)}):a.trim()&&n.indexOf(a)===-1&&n.push(a)}),{keywords:n.sort(function(a,r){return r.length-a.length}),length:n.length}}},{key:"isNumeric",value:function(t){return Number(parseFloat(t))==t}},{key:"checkRanges",value:function(t){var e=this;if(!Array.isArray(t)||Object.prototype.toString.call(t[0])!=="[object Object]")return this.log("markRanges() will only accept an array of objects"),this.opt.noMatch(t),[];var n=[],a=0;return t.sort(function(r,u){return r.start-u.start}).forEach(function(r){var u=e.callNoMatchOnInvalidRanges(r,a),l=u.start,m=u.end,b=u.valid;b&&(r.start=l,r.length=m-l,n.push(r),a=m)}),n}},{key:"callNoMatchOnInvalidRanges",value:function(t,e){var n=void 0,a=void 0,r=!1;return t&&typeof t.start<"u"?(n=parseInt(t.start,10),a=n+parseInt(t.length,10),this.isNumeric(t.start)&&this.isNumeric(t.length)&&a-e>0&&a-n>0?r=!0:(this.log("Ignoring invalid or overlapping range: "+(""+JSON.stringify(t))),this.opt.noMatch(t))):(this.log("Ignoring invalid range: "+JSON.stringify(t)),this.opt.noMatch(t)),{start:n,end:a,valid:r}}},{key:"checkWhitespaceRanges",value:function(t,e,n){var a=void 0,r=!0,u=n.length,l=e-u,m=parseInt(t.start,10)-l;return m=m>u?u:m,a=m+parseInt(t.length,10),a>u&&(a=u,this.log("End range automatically set to the max value of "+u)),m<0||a-m<0||m>u||a>u?(r=!1,this.log("Invalid range: "+JSON.stringify(t)),this.opt.noMatch(t)):n.substring(m,a).replace(/\s+/g,"")===""&&(r=!1,this.log("Skipping whitespace only range: "+JSON.stringify(t)),this.opt.noMatch(t)),{start:m,end:a,valid:r}}},{key:"getTextNodes",value:function(t){var e=this,n="",a=[];this.iterator.forEachNode(NodeFilter.SHOW_TEXT,function(r){a.push({start:n.length,end:(n+=r.textContent).length,node:r})},function(r){return e.matchesExclude(r.parentNode)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT},function(){t({value:n,nodes:a})})}},{key:"matchesExclude",value:function(t){return x.matches(t,this.opt.exclude.concat(["script","style","title","head","html"]))}},{key:"wrapRangeInTextNode",value:function(t,e,n){var a=this.opt.element?this.opt.element:"mark",r=t.splitText(e),u=r.splitText(n-e),l=document.createElement(a);return l.setAttribute("data-markjs","true"),this.opt.className&&l.setAttribute("class",this.opt.className),l.textContent=r.textContent,r.parentNode.replaceChild(l,r),u}},{key:"wrapRangeInMappedTextNode",value:function(t,e,n,a,r){var u=this;t.nodes.every(function(l,m){var b=t.nodes[m+1];if(typeof b>"u"||b.start>e){if(!a(l.node))return!1;var y=e-l.start,S=(n>l.end?l.end:n)-l.start,k=t.value.substr(0,l.start),T=t.value.substr(S+l.start);if(l.node=u.wrapRangeInTextNode(l.node,y,S),t.value=k+T,t.nodes.forEach(function(A,L){L>=m&&(t.nodes[L].start>0&&L!==m&&(t.nodes[L].start-=S),t.nodes[L].end-=S)}),n-=S,r(l.node.previousSibling,l.start),n>l.end)e=l.end;else return!1}return!0})}},{key:"wrapMatches",value:function(t,e,n,a,r){var u=this,l=e===0?0:e+1;this.getTextNodes(function(m){m.nodes.forEach(function(b){b=b.node;for(var y=void 0;(y=t.exec(b.textContent))!==null&&y[l]!=="";)if(n(y[l],b)){var S=y.index;if(l!==0)for(var k=1;k<l;k++)S+=y[k].length;b=u.wrapRangeInTextNode(b,S,S+y[l].length),a(b.previousSibling),t.lastIndex=0}}),r()})}},{key:"wrapMatchesAcrossElements",value:function(t,e,n,a,r){var u=this,l=e===0?0:e+1;this.getTextNodes(function(m){for(var b=void 0;(b=t.exec(m.value))!==null&&b[l]!=="";){var y=b.index;if(l!==0)for(var S=1;S<l;S++)y+=b[S].length;var k=y+b[l].length;u.wrapRangeInMappedTextNode(m,y,k,function(T){return n(b[l],T)},function(T,A){t.lastIndex=A,a(T)})}r()})}},{key:"wrapRangeFromIndex",value:function(t,e,n,a){var r=this;this.getTextNodes(function(u){var l=u.value.length;t.forEach(function(m,b){var y=r.checkWhitespaceRanges(m,l,u.value),S=y.start,k=y.end,T=y.valid;T&&r.wrapRangeInMappedTextNode(u,S,k,function(A){return e(A,m,u.value.substring(S,k),b)},function(A){n(A,m)})}),a()})}},{key:"unwrapMatches",value:function(t){for(var e=t.parentNode,n=document.createDocumentFragment();t.firstChild;)n.appendChild(t.removeChild(t.firstChild));e.replaceChild(n,t),this.ie?this.normalizeTextNode(e):e.normalize()}},{key:"normalizeTextNode",value:function(t){if(t){if(t.nodeType===3)for(;t.nextSibling&&t.nextSibling.nodeType===3;)t.nodeValue+=t.nextSibling.nodeValue,t.parentNode.removeChild(t.nextSibling);else this.normalizeTextNode(t.firstChild);this.normalizeTextNode(t.nextSibling)}}},{key:"markRegExp",value:function(t,e){var n=this;this.opt=e,this.log('Searching with expression "'+t+'"');var a=0,r="wrapMatches",u=function(m){a++,n.opt.each(m)};this.opt.acrossElements&&(r="wrapMatchesAcrossElements"),this[r](t,this.opt.ignoreGroups,function(l,m){return n.opt.filter(m,l,a)},u,function(){a===0&&n.opt.noMatch(t),n.opt.done(a)})}},{key:"mark",value:function(t,e){var n=this;this.opt=e;var a=0,r="wrapMatches",u=this.getSeparatedKeywords(typeof t=="string"?[t]:t),l=u.keywords,m=u.length,b=this.opt.caseSensitive?"":"i",y=function S(k){var T=new RegExp(n.createRegExp(k),"gm"+b),A=0;n.log('Searching with expression "'+T+'"'),n[r](T,1,function(L,U){return n.opt.filter(U,k,a,A)},function(L){A++,a++,n.opt.each(L)},function(){A===0&&n.opt.noMatch(k),l[m-1]===k?n.opt.done(a):S(l[l.indexOf(k)+1])})};this.opt.acrossElements&&(r="wrapMatchesAcrossElements"),m===0?this.opt.done(a):y(l[0])}},{key:"markRanges",value:function(t,e){var n=this;this.opt=e;var a=0,r=this.checkRanges(t);r&&r.length?(this.log("Starting to mark with the following ranges: "+JSON.stringify(r)),this.wrapRangeFromIndex(r,function(u,l,m,b){return n.opt.filter(u,l,m,b)},function(u,l){a++,n.opt.each(u,l)},function(){n.opt.done(a)})):this.opt.done(a)}},{key:"unmark",value:function(t){var e=this;this.opt=t;var n=this.opt.element?this.opt.element:"*";n+="[data-markjs]",this.opt.className&&(n+="."+this.opt.className),this.log('Removal selector "'+n+'"'),this.iterator.forEachNode(NodeFilter.SHOW_ELEMENT,function(a){e.unwrapMatches(a)},function(a){var r=x.matches(a,n),u=e.matchesExclude(a);return!r||u?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT},this.opt.done)}},{key:"opt",set:function(t){this._opt=v({},{element:"",className:"",exclude:[],iframes:!1,iframesTimeout:5e3,separateWordSearch:!0,diacritics:!0,synonyms:{},accuracy:"partially",acrossElements:!1,caseSensitive:!1,ignoreJoiners:!1,ignoreGroups:0,ignorePunctuation:[],wildcards:"disabled",each:function(){},noMatch:function(){},filter:function(){return!0},done:function(){},debug:!1,log:window.console},t)},get:function(){return this._opt}},{key:"iterator",get:function(){return new x(this.ctx,this.opt.iframes,this.opt.exclude,this.opt.iframesTimeout)}}]),c}();function g(c){var i=this,t=new h(c);return this.mark=function(e,n){return t.mark(e,n),i},this.markRegExp=function(e,n){return t.markRegExp(e,n),i},this.markRanges=function(e,n){return t.markRanges(e,n),i},this.unmark=function(e){return t.unmark(e),i},this}return g})})(Nt);var te=Nt.exports;const ee=Wt(te);let Q=null,V=null,R=null,N=null,X=!1;const pt=new Map,ut=new Map,ne=`
mark.ag-hl-keyword {
  background: rgba(99, 102, 241, 0.15);
  border-bottom: 2px solid #6366f1;
  border-radius: 1px;
  padding: 1px 0;
  cursor: pointer;
  transition: background 0.2s;
}
mark.ag-hl-keyword:hover { background: rgba(99, 102, 241, 0.30); }

mark.ag-hl-pass {
  background: rgba(16, 185, 129, 0.12);
  border-bottom: 2px solid #10b981;
  border-radius: 1px;
  padding: 1px 0;
  cursor: pointer;
}
mark.ag-hl-pass:hover { background: rgba(16, 185, 129, 0.28); }

mark.ag-hl-warn {
  background: rgba(245, 158, 11, 0.15);
  border-bottom: 2px solid #f59e0b;
  border-radius: 1px;
  padding: 1px 0;
  cursor: pointer;
}
mark.ag-hl-warn:hover { background: rgba(245, 158, 11, 0.32); }

mark.ag-hl-fail {
  background: rgba(239, 68, 68, 0.15);
  border-bottom: 2px solid #ef4444;
  border-radius: 1px;
  padding: 1px 0;
  cursor: pointer;
}
mark.ag-hl-fail:hover { background: rgba(239, 68, 68, 0.30); }

mark.ag-hl-active {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
  border-radius: 2px;
  animation: ag-hl-pulse 0.6s ease-in-out 3;
}
@keyframes ag-hl-pulse {
  0%, 100% { outline-color: #4f46e5; }
  50% { outline-color: transparent; }
}

/* Tooltip (hover) */
#ag-tooltip {
  position: fixed;
  z-index: 2147483647;
  max-width: 320px;
  padding: 10px 14px;
  background: #1e293b;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
  pointer-events: none;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 0.15s, transform 0.15s;
}
#ag-tooltip.ag-tooltip-visible {
  opacity: 1;
  transform: translateY(0);
}
#ag-tooltip .ag-tt-badge {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: 6px;
}
#ag-tooltip .ag-tt-badge-pass { background: #10b981; color: #fff; }
#ag-tooltip .ag-tt-badge-warn { background: #f59e0b; color: #fff; }
#ag-tooltip .ag-tt-badge-fail { background: #ef4444; color: #fff; }
#ag-tooltip .ag-tt-badge-keyword { background: #6366f1; color: #fff; }
#ag-tooltip .ag-tt-item {
  font-weight: 600;
  margin-bottom: 4px;
}
#ag-tooltip .ag-tt-detail {
  color: #cbd5e1;
}
#ag-tooltip .ag-tt-hint {
  color: #94a3b8;
  font-size: 10px;
  margin-top: 6px;
  border-top: 1px solid #334155;
  padding-top: 4px;
}

/* Causal Chain Panel (click) — Bottom-up timeline */
#ag-chain-panel {
  position: fixed;
  z-index: 2147483647;
  width: 340px;
  background: #0f172a;
  color: #f1f5f9;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.5;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(99,102,241,0.2);
  opacity: 0;
  transform: translateY(8px) scale(0.97);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
  overflow: hidden;
}
#ag-chain-panel.ag-panel-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

/* Panel header */
#ag-chain-panel .ag-cp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: linear-gradient(135deg, #1e1b4b, #312e81);
  border-bottom: 1px solid #3730a3;
}
#ag-chain-panel .ag-cp-title {
  font-size: 13px;
  font-weight: 700;
  color: #c7d2fe;
}
#ag-chain-panel .ag-cp-close {
  width: 22px;
  height: 22px;
  border: none;
  background: rgba(255,255,255,0.1);
  color: #a5b4fc;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  line-height: 1;
  transition: background 0.15s;
}
#ag-chain-panel .ag-cp-close:hover {
  background: rgba(255,255,255,0.2);
}

/* Timeline container */
#ag-chain-panel .ag-cp-timeline {
  position: relative;
  padding: 16px 14px 12px 14px;
}

/* Continuous vertical line */
#ag-chain-panel .ag-cp-line {
  position: absolute;
  left: 25px;
  top: 28px;
  bottom: 24px;
  width: 2px;
  border-radius: 2px;
}

/* Single timeline row */
#ag-chain-panel .ag-cp-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}

/* Node dot */
#ag-chain-panel .ag-cp-dot {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2.5px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}
#ag-chain-panel .ag-cp-dot-top {
  background: #6366f1;
  border-color: #818cf8;
  width: 26px;
  height: 26px;
  font-size: 12px;
}
#ag-chain-panel .ag-cp-dot-bottom {
  background: #10b981;
  border-color: #34d399;
  width: 26px;
  height: 26px;
  font-size: 12px;
}
#ag-chain-panel .ag-cp-dot-mid {
  background: #334155;
  border-color: #475569;
}

/* Node label */
#ag-chain-panel .ag-cp-label {
  font-size: 13px;
  font-weight: 500;
  color: #e2e8f0;
}
#ag-chain-panel .ag-cp-label-top {
  font-weight: 700;
  color: #a5b4fc;
}
#ag-chain-panel .ag-cp-label-bottom {
  font-weight: 700;
  color: #6ee7b7;
}
#ag-chain-panel .ag-cp-label-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 0 5px;
  border-radius: 3px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.3px;
  vertical-align: middle;
}
#ag-chain-panel .ag-cp-label-tag-value {
  background: rgba(99,102,241,0.2);
  color: #a5b4fc;
}
#ag-chain-panel .ag-cp-label-tag-base {
  background: rgba(16,185,129,0.2);
  color: #6ee7b7;
}

/* KPI section */
#ag-chain-panel .ag-cp-kpi {
  padding: 0 14px 12px;
}
#ag-chain-panel .ag-cp-kpi-label {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}
#ag-chain-panel .ag-cp-kpi-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
#ag-chain-panel .ag-cp-kpi-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  background: rgba(99,102,241,0.1);
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 12px;
  font-size: 11px;
  color: #c7d2fe;
}
#ag-chain-panel .ag-cp-kpi-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #818cf8;
}

/* Impact footer */
#ag-chain-panel .ag-cp-impact {
  padding: 8px 14px;
  background: #1e293b;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #64748b;
}
#ag-chain-panel .ag-cp-impact-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
}
#ag-chain-panel .ag-cp-impact-high {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}
#ag-chain-panel .ag-cp-impact-medium {
  background: rgba(245, 158, 11, 0.2);
  color: #fcd34d;
}
#ag-chain-panel .ag-cp-impact-low {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
}

/* ── Connection Overlay ── */
.ag-conn-highlight-title {
  position: relative;
  outline: 3px solid #6366f1 !important;
  outline-offset: 3px;
  border-radius: 4px;
  background: rgba(99, 102, 241, 0.10) !important;
  z-index: 1;
}
.ag-conn-highlight-body {
  position: relative;
  outline: 3px solid #10b981 !important;
  outline-offset: 3px;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.10) !important;
  z-index: 1;
}
.ag-conn-label {
  position: fixed;
  z-index: 2147483647;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 11px;
  font-weight: 700;
  pointer-events: none;
  white-space: nowrap;
  animation: ag-conn-pop 0.35s cubic-bezier(0.34,1.56,0.64,1);
}
.ag-conn-label-title {
  background: #6366f1;
  color: #fff;
  box-shadow: 0 2px 8px rgba(99,102,241,0.4);
}
.ag-conn-label-body {
  background: #10b981;
  color: #fff;
  box-shadow: 0 2px 8px rgba(16,185,129,0.4);
}
@keyframes ag-conn-pop {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}

/* ── Convergence Node ── */
.ag-conn-node {
  position: fixed;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 16px;
  background: #fff;
  border: 2px solid #6366f1;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(99,102,241,0.22), 0 0 0 1px rgba(99,102,241,0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  pointer-events: none;
  animation: ag-conn-node-in 0.5s cubic-bezier(0.34,1.56,0.64,1);
}
.ag-conn-node-title {
  font-size: 11px;
  font-weight: 700;
  color: #4f46e5;
  white-space: nowrap;
}
.ag-conn-node-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(16,185,129,0.12);
  color: #059669;
  font-size: 10px;
  font-weight: 700;
}
@keyframes ag-conn-node-in {
  from { opacity: 0; transform: scale(0.8) translateX(20px); }
  to   { opacity: 1; transform: scale(1) translateX(0); }
}
`;function q(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function dt(){V||(V=document.createElement("style"),V.id="ag-highlight-styles",V.textContent=ne,document.head.appendChild(V))}function oe(){R||(R=document.createElement("div"),R.id="ag-tooltip",document.body.appendChild(R))}function ae(){N||(N=document.createElement("div"),N.id="ag-chain-panel",document.body.appendChild(N))}function ft(){const o=[".document-body",".doc-content",".view-content","#docBody","#contents",".approval-content",".doc_contents",".editor-content",".doc-view","#divFormBind",".div_form_bind",'[data-role="doc-body"]',".doc-body","article","main",".content-wrap"];for(const s of o){const p=document.querySelector(s);if(p)return p}return document.body}function ie(o){const s=o.textContent||"";for(const[p,d]of pt)if(s.includes(p)||p.includes(s))return{phrase:p,info:d};return null}function ht(o){const s=(o.textContent||"").toLowerCase();for(const[p,d]of ut)if(s.includes(p.toLowerCase())||p.toLowerCase().includes(s))return d;return null}function re(o){return o.classList.contains("ag-hl-pass")?"pass":o.classList.contains("ag-hl-warn")?"warn":o.classList.contains("ag-hl-fail")?"fail":"keyword"}const se={pass:"Pass",warn:"Warn",fail:"Fail",keyword:"주제"},ce={high:"높음",medium:"보통",low:"낮음"};function le(o){if(oe(),!R)return;const s=re(o),p=ie(o),d=ht(o)!==null;let f;if(p)f=`
      <div class="ag-tt-item">
        <span class="ag-tt-badge ag-tt-badge-${s}">${se[s]}</span>
        ${q(p.info.item)}
      </div>
      <div class="ag-tt-detail">${q(p.info.detail)}</div>
    `;else{const i=o.textContent||"";f=`
      <div class="ag-tt-item">
        <span class="ag-tt-badge ag-tt-badge-keyword">주제</span>
        ${q(i)}
      </div>
      <div class="ag-tt-detail">문서의 핵심 주제 키워드</div>
    `}d&&(f+='<div class="ag-tt-hint">클릭하면 인과관계 · KPI 연관도 표시</div>'),R.innerHTML=f;const v=o.getBoundingClientRect(),x=320;let h=v.left+v.width/2-x/2;h=Math.max(8,Math.min(h,window.innerWidth-x-8)),R.style.left=`${h}px`,R.style.top="0px",R.style.maxWidth=`${x}px`,R.classList.add("ag-tooltip-visible");const g=R.offsetHeight;let c=v.top-g-8;c<8&&(c=v.bottom+8),R.style.top=`${c}px`}function gt(){R&&R.classList.remove("ag-tooltip-visible")}function pe(o){const s=ht(o);if(!s||(gt(),ae(),!N))return;const p=s.chain.length,d=[...s.chain].reverse().map((e,n)=>{const a=p-1-n,r=a===p-1,u=a===0,l=Math.round(a/Math.max(p-1,1)*120),m=r?"#6366f1":u?"#10b981":"#475569",b=r?"rgba(99,102,241,0.08)":u?"rgba(16,185,129,0.08)":"rgba(51,65,85,0.06)",y=r?"#a5b4fc":u?"#6ee7b7":"#e2e8f0",S=r?"🎯":u?"📋":"▸",k=r?'<span class="ag-cp-label-tag ag-cp-label-tag-value">목표</span>':u?'<span class="ag-cp-label-tag ag-cp-label-tag-base">기안</span>':"";return`${n>0?`<div style="padding-left:${l-10}px;height:10px;display:flex;align-items:center;">
            <svg width="20" height="10" viewBox="0 0 20 10" fill="none" style="color:#334155">
              <path d="M2 10 L10 2 L18 2" stroke="currentColor" stroke-width="1.5"/>
            </svg>
          </div>`:""}<div style="margin-left:${l}px;border-left:3px solid ${m};background:${b};border-radius:6px;padding:6px 10px;display:flex;align-items:center;gap:8px;">
        <span style="font-size:12px;">${S}</span>
        <span style="font-size:12px;font-weight:${r||u?"700":"500"};color:${y};">${q(e)}${k}</span>
      </div>`}).join(""),f=s.kpis.length>0?`<div class="ag-cp-kpi">
        <div class="ag-cp-kpi-label">📊 연관 KPI</div>
        <div class="ag-cp-kpi-list">
          ${s.kpis.map(e=>`<span class="ag-cp-kpi-tag"><span class="ag-cp-kpi-dot"></span>${q(e)}</span>`).join("")}
        </div>
      </div>`:"",v=`<div class="ag-cp-impact">
    영향도
    <span class="ag-cp-impact-badge ag-cp-impact-${s.impact}">${ce[s.impact]||"보통"}</span>
  </div>`;N.innerHTML=`
    <div class="ag-cp-header">
      <span class="ag-cp-title">🔗 ${q(s.keyword)}</span>
      <button class="ag-cp-close" id="ag-cp-close-btn">✕</button>
    </div>
    <div class="ag-cp-timeline">
      ${d}
    </div>
    ${f}
    ${v}
  `;const x=o.getBoundingClientRect(),h=340;let g=x.left+x.width/2-h/2;g=Math.max(8,Math.min(g,window.innerWidth-h-8)),N.style.left=`${g}px`,N.style.top="0px",N.style.width=`${h}px`,N.classList.add("ag-panel-visible");const c=N.offsetHeight;let i=x.top-c-12;i<8&&(i=x.bottom+12),i+c>window.innerHeight-8&&(i=window.innerHeight-c-8),N.style.top=`${i}px`;const t=N.querySelector("#ag-cp-close-btn");t==null||t.addEventListener("click",e=>{e.stopPropagation(),mt()})}function mt(){N&&N.classList.remove("ag-panel-visible")}let Ct=!1;function ue(){Ct||(Ct=!0,document.addEventListener("mouseover",o=>{var p,d;const s=(d=(p=o.target).closest)==null?void 0:d.call(p,"mark[data-markjs]");s&&X&&le(s)}),document.addEventListener("mouseout",o=>{var p,d;((d=(p=o.target).closest)==null?void 0:d.call(p,"mark[data-markjs]"))&&gt()}),document.addEventListener("click",o=>{var p,d;if(!X||N&&N.contains(o.target))return;const s=(d=(p=o.target).closest)==null?void 0:d.call(p,"mark[data-markjs]");s?ht(s)&&pe(s):mt()}))}function Z(o,s="ag-hl-keyword"){dt(),ue();const p=ft();Q||(Q=new ee(p));for(const d of o)!d||d.length<2||Q.mark(d,{className:s,accuracy:"partially",separateWordSearch:!1,caseSensitive:!1});X=!0}function de(o){if(xt(),pt.clear(),ut.clear(),o.causalChains)for(const f of o.causalChains)f.keyword&&f.chain.length>=2&&ut.set(f.keyword,f);const s=[],p=[],d=[];for(const f of o.checks){const v=Rt(f.detail);v&&(pt.set(v,{item:f.item,result:f.result,detail:f.detail}),f.result==="PASS"?s.push(v):f.result==="WARN"?p.push(v):f.result==="FAIL"&&d.push(v))}o.topics&&o.topics.length>0&&Z(o.topics,"ag-hl-keyword"),s.length>0&&Z(s,"ag-hl-pass"),p.length>0&&Z(p,"ag-hl-warn"),d.length>0&&Z(d,"ag-hl-fail"),X=!0}function Rt(o){var d;if(!o)return null;const s=o.match(/['\u201C\u201D]([^'\u201C\u201D]{2,20})['\u201C\u201D]|\u2018([^\u2019]{2,20})\u2019/);if(s)return s[1]||s[2];const p=(d=o.split(/[,。.]/)[0])==null?void 0:d.trim();return p&&p.length>=2&&p.length<=30?p:null}function xt(){Q&&Q.unmark(),gt(),mt(),X=!1}function Lt(o){var v,x;if(!o)return;dt();const s=document.querySelectorAll("mark[data-markjs]");for(const h of s)if((v=h.textContent)!=null&&v.includes(o)){At(h);return}for(const h of s){const g=h.textContent||"";if(g.length>=2&&o.includes(g)){At(h);return}}const p=ft(),d=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);let f;for(;f=d.nextNode();){const h=((x=f.textContent)==null?void 0:x.indexOf(o))??-1;if(h===-1)continue;const g=document.createRange();g.setStart(f,h),g.setEnd(f,h+o.length);const c=document.createElement("mark");c.className="ag-hl-warn ag-hl-active",c.setAttribute("data-ag-temp","true"),g.surroundContents(c),c.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>{c.classList.remove("ag-hl-active"),setTimeout(()=>{const i=c.parentNode;i&&(i.replaceChild(document.createTextNode(c.textContent||""),c),i.normalize())},1500)},2e3);return}}function At(o){document.querySelectorAll(".ag-hl-active").forEach(s=>s.classList.remove("ag-hl-active")),o.classList.add("ag-hl-active"),o.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>o.classList.remove("ag-hl-active"),2e3)}function fe(o){return X?(xt(),!1):o?(de(o),!0):!1}const j=[{main:"#6366f1",light:"#818cf8"},{main:"#10b981",light:"#34d399"},{main:"#f59e0b",light:"#fbbf24"},{main:"#ec4899",light:"#f472b6"},{main:"#8b5cf6",light:"#a78bfa"},{main:"#06b6d4",light:"#22d3ee"}];let B=null,H=null,O=null,P=null,G=null,K=null,z=null;function he(o){if(!o)return[];const s=[],p=/['"""\u201C]([^'"""\u201C\u201D]{2,60})['"""\u201D]/g;let d;for(;(d=p.exec(o))!==null;)s.push(d[1].trim());const f=/\u2018([^\u2019]{2,60})\u2019/g;for(;(d=f.exec(o))!==null;)s.push(d[1].trim());return s}function ge(o){var x;if(!o)return[];const s=o.replace(/\s+/g," "),p=["세부추진계획","추진일정","소요예산","추진경과","추진 경과","향후계획","향후 계획","기대효과","세부내용","기안내용","기안 내용","추진방안","추진 방안","필요성","문제점","목적","배경","현황","효과","근거","결론","비용","일정","방안","대안","개요","내용","취지","경과","성과","계획","대상","범위","방법"],d=[];for(const h of p){const g=h.replace(/\s+/g,"");!s.includes(h)&&!s.replace(/\s+/g,"").includes(g)||d.some(c=>c.replace(/\s+/g,"").includes(g))||d.push(g)}if(d.length>0)return d;const f=[...o.matchAll(/['"""\u201C]([^'""]{2,20})['"""\u201D]/g)];if(f.length>0)return f.map(h=>h[1]).filter(Boolean);const v=(x=o.split(/[,。.]/)[0])==null?void 0:x.trim();return v&&v.length>=2&&v.length<=30?[v]:[]}function ct(o,s){if(!o||!s)return!1;const p=o.replace(/\s+/g,""),d=s.replace(/\s+/g,"");return p.includes(d)}function lt(o,s){if(s.has(o))return!0;for(const p of s)if(p.contains(o)||o.contains(p))return!0;return!1}function me(o,s,p){var f,v,x;const d=o===document.body?[o]:[o,document.body];for(const h of d){const g=["h1,h2,h3,h4,h5,h6","strong,b","th,dt","label,em"];let c=null;for(const r of g){const u=h.querySelectorAll(r);for(const l of u){const m=l;if(lt(m,p))continue;const b=((f=m.textContent)==null?void 0:f.trim())||"";b.length>150||b.length<s.replace(/\s+/g,"").length||ct(b,s)&&(!c||b.length<c.len)&&(c={el:m,len:b.length})}}if(c)return c.el;const i=h.querySelectorAll("td");let t=null;for(const r of i){const u=r;if(lt(u,p))continue;const l=((v=u.textContent)==null?void 0:v.trim())||"";l.length>100||l.length<s.replace(/\s+/g,"").length||ct(l,s)&&(!t||l.length<t.len)&&(t={el:u,len:l.length})}if(t)return t.el;const e=h.querySelectorAll("p, div, span, li, a");let n=null,a=1/0;for(const r of e){const u=r;if(lt(u,p))continue;const l=((x=u.textContent)==null?void 0:x.trim())||"";ct(l,s)&&(l.length>300||l.length<s.replace(/\s+/g,"").length||l.length<a&&(n=u,a=l.length))}if(n)return n}return null}function xe(o){if(o.length===0)return;if(o.length===1){o[0].el.scrollIntoView({behavior:"smooth",block:"center"});return}const s=o.map(x=>{const h=x.el.getBoundingClientRect();return{top:h.top+window.scrollY,bottom:h.bottom+window.scrollY}}),p=Math.min(...s.map(x=>x.top)),f=Math.max(...s.map(x=>x.bottom))-p,v=window.innerHeight;if(f<=v*.85){const x=p+f/2;window.scrollTo({top:Math.max(0,x-v/2),behavior:"smooth"})}else window.scrollTo({top:Math.max(0,p-60),behavior:"smooth"})}function be(o,s,p,d,f,v,x){dt(),B&&B();const h=ft(),g=[];if(x&&x.length>0){const c=new Set;for(let i=0;i<x.length;i++){const t=x[i].trim();if(!t||t.length<4)continue;let e=W(h,t,!1);if(!e){const l=t.length>20?t.slice(0,20):t;e=W(h,l,!1)}if(!e||c.has(e))continue;let n=!1;const a=[];for(const l of c)if(l.contains(e))a.push(l);else if(e.contains(l)){n=!0;break}if(n)continue;for(const l of a){c.delete(l);const m=g.findIndex(b=>b.el===l);m>=0&&g.splice(m,1)}const r=t.length>15?t.slice(0,15)+"…":t,u=j[i%j.length];g.push({el:e,label:r,color:u.main,colorLight:u.light,highlightClass:"ag-conn-highlight-body"}),c.add(e)}}if(g.length===0){const c=he(s),i=new Set;for(let t=0;t<c.length;t++){const e=c[t];if(e.length<3)continue;let n=W(h,e,!1);if(!n&&h!==document.body&&(n=W(document.body,e,!1)),!n||i.has(n))continue;let a=!1;const r=[];for(const m of i)if(m.contains(n))r.push(m);else if(n.contains(m)){a=!0;break}if(a)continue;for(const m of r){i.delete(m);const b=g.findIndex(y=>y.el===m);b>=0&&g.splice(b,1)}const u=e.length>15?e.slice(0,15)+"…":e,l=j[t%j.length];g.push({el:n,label:u,color:l.main,colorLight:l.light,highlightClass:"ag-conn-highlight-body"}),i.add(n)}if(g.length===0){const t=ge(s);for(let e=0;e<t.length;e++){const n=t[e];let a=me(h,n,i);if(a||(a=W(h,n,!0)),a||(a=W(document.body,n,!0)),a||(a=W(h,n,!1)),!a||i.has(a))continue;let r=!1;const u=[];for(const m of i)if(m.contains(a))u.push(m);else if(a.contains(m)){r=!0;break}if(r)continue;for(const m of u){i.delete(m);const b=g.findIndex(y=>y.el===m);b>=0&&g.splice(b,1)}const l=j[e%j.length];g.push({el:a,label:n,color:l.main,colorLight:l.light,highlightClass:"ag-conn-highlight-body"}),i.add(a)}}}if(g.length===0){const c=Rt(s);c&&Lt(c);return}for(const c of g)c.el.classList.add(c.highlightClass);xe(g),setTimeout(()=>ve(g,o,d,f,v),500),B=()=>{var c;H&&(window.removeEventListener("scroll",H),H=null),P&&(window.removeEventListener("resize",P),P=null),O&&(cancelAnimationFrame(O),O=null),z&&(clearTimeout(z),z=null),G&&(document.removeEventListener("click",G,!0),G=null),K&&(clearTimeout(K),K=null);for(const i of g)i.el.classList.remove(i.highlightClass);(c=document.getElementById("ag-conn-overlay"))==null||c.remove(),document.querySelectorAll(".ag-conn-label").forEach(i=>i.remove()),document.querySelectorAll(".ag-conn-node").forEach(i=>i.remove()),B=null},G=c=>{const i=c.target;i&&(i.closest(".ag-conn-node, .ag-conn-label, #ag-conn-overlay")||i.closest(".ag-conn-highlight-title, .ag-conn-highlight-body")||B&&B())},K=setTimeout(()=>{G&&document.addEventListener("click",G,!0),K=null},600)}function W(o,s,p){if(!s||s.length<2)return null;const d=s.trim().toLowerCase(),f=d.replace(/\s+/g,"");if(p){const g=["h1","h2","h3","h4",".doc-title",".subject",'[class*="title"]','[class*="subject"]',"strong","b","th","td"];let c=null;const i=o===document.body?[o]:[o,document.body];for(const t of i){for(const e of g)try{const n=t.querySelectorAll(e);for(const a of n){const r=(a.textContent||"").trim().toLowerCase(),u=r.replace(/\s+/g,"");if(!r||r.length<2||r.length>200)continue;if(u.includes(f)||f.includes(u)){const b=Math.min(u.length,f.length)/Math.max(u.length,f.length);(!c||b>c.score)&&(c={el:a,score:b})}const l=d.split(/\s+/).filter(b=>b.length>=2),m=r.split(/\s+/).filter(b=>b.length>=2);if(l.length>0&&m.length>0){const b=l.filter(S=>m.some(k=>k.includes(S)||S.includes(k))),y=b.length/l.length*.8;(b.length>=2||b.length>=1&&l.length<=2)&&(!c||y>c.score)&&(c={el:a,score:y})}}}catch{}if(c&&c.score>=.3)return c.el}}const v=document.createTreeWalker(o,NodeFilter.SHOW_TEXT);let x;for(;x=v.nextNode();){const g=(x.textContent||"").toLowerCase(),c=g.replace(/\s+/g,"");if((g.includes(d)||c.includes(f))&&x.parentElement)return x.parentElement}const h=d.split(/\s+/).filter(g=>g.length>=2);if(h.length>=2){const g=document.createTreeWalker(o,NodeFilter.SHOW_TEXT);for(;x=g.nextNode();){const c=(x.textContent||"").toLowerCase();if(c.length<4)continue;if(h.filter(t=>c.includes(t)).length>=Math.ceil(h.length*.5)&&x.parentElement)return x.parentElement}}return null}function ve(o,s,p,d,f){var yt,wt,kt;if((yt=document.getElementById("ag-conn-overlay"))==null||yt.remove(),document.querySelectorAll(".ag-conn-label").forEach(w=>w.remove()),document.querySelectorAll(".ag-conn-node").forEach(w=>w.remove()),H&&(window.removeEventListener("scroll",H),H=null),P&&(window.removeEventListener("resize",P),P=null),O&&(cancelAnimationFrame(O),O=null),z&&(clearTimeout(z),z=null),o.length===0)return;const v=window.innerWidth,x=window.innerHeight,h='position:fixed !important;z-index:2147483647 !important;display:flex !important;flex-direction:column !important;align-items:center !important;gap:4px !important;right:16px !important;padding:10px 16px !important;background:#fff !important;border:2px solid #6366f1 !important;border-radius:12px !important;box-shadow:0 4px 24px rgba(99,102,241,0.22),0 0 0 1px rgba(99,102,241,0.08) !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important;pointer-events:none !important;opacity:1 !important;visibility:visible !important;',g='position:fixed !important;z-index:2147483647 !important;display:inline-flex !important;align-items:center !important;gap:5px !important;padding:4px 10px !important;border-radius:6px !important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important;font-size:11px !important;font-weight:700 !important;pointer-events:none !important;white-space:nowrap !important;opacity:1 !important;visibility:visible !important;transition:top 0.15s ease-out,left 0.15s ease-out !important;',c=document.createElement("div");c.className="ag-conn-node",c.style.cssText=h+"top:50%;";const i=document.createElement("div");i.style.cssText="font-size:11px !important;font-weight:700 !important;color:#4f46e5 !important;white-space:nowrap !important;",i.textContent=s;const t=p!=null&&d!=null?`${p}/${d}`:"",e=f||"",n={PASS:{bg:"rgba(16,185,129,0.12)",color:"#059669"},WARN:{bg:"rgba(245,158,11,0.12)",color:"#d97706"},FAIL:{bg:"rgba(244,63,94,0.12)",color:"#e11d48"}},a=n[e]||n.PASS,r=document.createElement("div");r.style.cssText="display:inline-flex !important;align-items:center !important;gap:6px !important;";const u=document.createElement("span");u.style.cssText=`font-size:13px !important;font-weight:800 !important;color:${a.color} !important;letter-spacing:-0.5px !important;`,u.textContent=t;const l=document.createElement("span");l.style.cssText=`display:inline-flex !important;align-items:center !important;padding:2px 8px !important;border-radius:4px !important;background:${a.bg} !important;color:${a.color} !important;font-size:10px !important;font-weight:700 !important;`,l.textContent=e,r.appendChild(u),r.appendChild(l);const m=document.createElement("div");m.style.cssText="display:inline-flex !important;align-items:center !important;gap:3px !important;flex-wrap:wrap !important;justify-content:center !important;margin-top:2px !important;padding:2px 6px !important;border-radius:4px !important;background:rgba(99,102,241,0.06) !important;";const b=[];for(let w=0;w<o.length;w++){const E=o[w];w>0&&b.push('<span style="font-size:8px !important;color:#cbd5e1 !important;">·</span>'),b.push(`<span style="display:inline-flex !important;align-items:center !important;gap:2px !important;"><span style="display:inline-block !important;width:6px !important;height:6px !important;border-radius:50% !important;background:${E.color} !important;"></span><span style="font-size:9px !important;font-weight:700 !important;color:${E.color} !important;">${q(E.label)}</span></span>`)}m.innerHTML=b.join(""),c.appendChild(i),c.appendChild(r),c.appendChild(m),document.body.appendChild(c);const y=document.createElementNS("http://www.w3.org/2000/svg","svg");y.id="ag-conn-overlay",y.setAttribute("width",String(v)),y.setAttribute("height",String(x)),y.style.cssText="position:fixed !important;left:0 !important;top:0 !important;width:100vw !important;height:100vh !important;z-index:2147483646 !important;pointer-events:none !important;overflow:visible !important;opacity:1 !important;visibility:visible !important;";const S=document.createElementNS("http://www.w3.org/2000/svg","defs");for(let w=0;w<o.length;w++){const E=o[w],C=document.createElementNS("http://www.w3.org/2000/svg","linearGradient");C.id=`ag-grad-${w}`,C.setAttribute("x1","0"),C.setAttribute("y1","0"),C.setAttribute("x2","1"),C.setAttribute("y2","0");const I=document.createElementNS("http://www.w3.org/2000/svg","stop");I.setAttribute("offset","0%"),I.setAttribute("stop-color",E.color);const M=document.createElementNS("http://www.w3.org/2000/svg","stop");M.setAttribute("offset","100%"),M.setAttribute("stop-color",E.colorLight),C.appendChild(I),C.appendChild(M),S.appendChild(C)}y.appendChild(S);const k=[];for(let w=0;w<o.length;w++){const E=o[w],C=document.createElementNS("http://www.w3.org/2000/svg","path");C.setAttribute("fill","none"),C.setAttribute("stroke",`url(#ag-grad-${w})`),C.setAttribute("stroke-width","2.5"),C.setAttribute("stroke-linecap","round"),C.setAttribute("opacity","0.85"),y.appendChild(C);const I=document.createElementNS("http://www.w3.org/2000/svg","circle");I.setAttribute("r","4"),I.setAttribute("fill",E.color),y.appendChild(I);const M=document.createElement("div");M.className="ag-conn-label",M.textContent=E.label,M.style.cssText=g+`background:${E.color} !important;color:#fff !important;box-shadow:0 2px 8px ${E.color}66 !important;`,document.body.appendChild(M),k.push({path:C,dot:I,label:M})}const T=document.createElementNS("http://www.w3.org/2000/svg","circle");T.setAttribute("r","5"),T.setAttribute("fill",o[0].color),y.appendChild(T),document.body.appendChild(y);const A=o.map(w=>{const E=w.el.getBoundingClientRect();return E.top+E.height/2});let L=A.reduce((w,E)=>w+E,0)/A.length;L=Math.max(60,Math.min(x-60,L)),c.style.top=`${L-28}px`;let U=L;const Ot=.12,vt=()=>{const w=window.innerWidth,E=window.innerHeight;y.setAttribute("width",String(w)),y.setAttribute("height",String(E));const C=o.map(_=>_.el.getBoundingClientRect()),I=C.map(_=>_.top+_.height/2),M=I.filter((_,$)=>{const F=C[$];return F.bottom>0&&F.top<E}),St=M.length>0?M:I;let ot=St.reduce((_,$)=>_+$,0)/St.length;ot=Math.max(60,Math.min(E-60,ot)),U+=(ot-U)*Ot,c.style.top=`${U-28}px`;const at=c.getBoundingClientRect(),J=at.left,et=at.top+at.height/2;for(let _=0;_<k.length;_++){const $=k[_],F=C[_],nt=I[_],Y=Math.min(F.right+10,w-160),it=J-Y;Math.abs(it)<20?$.path.setAttribute("d",`M ${Y} ${nt} L ${J} ${et}`):$.path.setAttribute("d",`M ${Y} ${nt} C ${Y+it*.5} ${nt}, ${J-it*.3} ${et}, ${J} ${et}`),$.dot.setAttribute("cx",String(Y)),$.dot.setAttribute("cy",String(nt)),$.label.style.left=`${Math.max(8,F.left)}px`,$.label.style.top=`${Math.max(4,F.top-28)}px`}T.setAttribute("cx",String(J)),T.setAttribute("cy",String(et))};vt();for(let w=0;w<k.length;w++){const E=k[w],C=((kt=(wt=E.path).getTotalLength)==null?void 0:kt.call(wt))||600,I=(w*.15).toFixed(2);E.path.setAttribute("stroke-dasharray",String(C)),E.path.setAttribute("stroke-dashoffset",String(C)),E.path.innerHTML=`<animate attributeName="stroke-dashoffset" from="${C}" to="0" dur="0.6s" begin="${I}s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1"/>`,E.dot.setAttribute("opacity","0"),E.dot.innerHTML=`<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="${I}s" fill="freeze"/>`}const $t=(k.length*.15+.3).toFixed(2);T.setAttribute("opacity","0"),T.innerHTML=`<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="${$t}s" fill="freeze"/>`;const zt=Math.max(800,k.length*150+600);setTimeout(()=>{for(const M of k)M.path.removeAttribute("stroke-dasharray"),M.path.removeAttribute("stroke-dashoffset"),M.path.innerHTML="",M.dot.setAttribute("opacity","1"),M.dot.innerHTML="";T.setAttribute("opacity","1"),T.innerHTML="";let w=0;const E=30,C=()=>{vt(),w--,w>0?O=requestAnimationFrame(C):O=null},I=()=>{w=E,O||(O=requestAnimationFrame(C))};H=()=>{w=E,O||(O=requestAnimationFrame(C)),z&&clearTimeout(z),z=setTimeout(()=>{I(),z=null},100)},window.addEventListener("scroll",H,{passive:!0}),P=()=>{I()},window.addEventListener("resize",P,{passive:!0})},zt)}function bt(o){var s,p;try{(p=(s=chrome==null?void 0:chrome.runtime)==null?void 0:s.sendMessage)==null||p.call(s,o)}catch{}}let It="",tt="unknown";function ye(){var d;const o=((d=document.body)==null?void 0:d.innerText)||"",s=["결재","기안","승인","품의","반려","결의","기안자","결재선","결재일"];let p=0;for(const f of s)o.includes(f)&&p++;return p>=2}async function _t(){It=window.location.href,tt=qt(),!(tt==="unknown"&&!ye())&&bt({type:"PAGE_DETECTED",payload:{url:It,groupware:tt}})}async function we(){const o=await Gt();if(!o)return;const{hash:s,domHtml:p}=o;bt({type:"DOM_HASH",payload:{hash:s,groupware:tt,domHtml:p}})}function ke(){var o,s;(s=(o=chrome==null?void 0:chrome.runtime)==null?void 0:o.onMessage)==null||s.addListener((p,d,f)=>{if(!(!p||!p.type))switch(p.type){case"START_PARSE":{we();break}case"PARSE_RULE":{const v=p.payload,x=Qt(v,tt);x.rawText=Zt(),bt({type:"DOM_PARSED",payload:x});break}case"ANALYSIS_COMPLETE":break;case"HIGHLIGHT_TEXT":{const{keywords:v,className:x}=p.payload;Z(v,x);break}case"CLEAR_HIGHLIGHTS":{xt();break}case"SCROLL_TO_HIGHLIGHT":{Lt(p.payload.text);break}case"SHOW_CHECK_CONNECTION":{const{item:v,detail:x,subject:h,score:g,weight:c,checkResult:i,evidenceRefs:t}=p.payload;be(v,x,h,g,c,i,t);break}case"TOGGLE_HIGHLIGHTS":{const v=p.payload;fe(v??void 0);break}case"ERROR":{console.warn("[ApprovalGraph] Background error:",p.payload.message);break}}})}function Se(){let o=window.location.href;new MutationObserver(()=>{const p=window.location.href;p!==o&&(o=p,setTimeout(()=>{_t()},500))}).observe(document.body,{childList:!0,subtree:!0})}ke();_t();Se();
