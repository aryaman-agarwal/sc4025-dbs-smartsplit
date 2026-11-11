/* @ds-bundle: {"format":4,"namespace":"SmartSplit","components":[{"name":"Button"},{"name":"Card"},{"name":"Money"},{"name":"Badge"},{"name":"Avatar"},{"name":"PositionLabel"},{"name":"Banner"},{"name":"SectionTitle"},{"name":"ListRow"},{"name":"QuickAction"},{"name":"ScreenHeader"},{"name":"HeroHeader"},{"name":"TabBar"},{"name":"Field"},{"name":"Icon"}]} */
(function(){
var h=React.createElement;
function cx(){return Array.prototype.filter.call(arguments,Boolean).join(" ");}
var P={
 chevronLeft:"M15 18l-6-6 6-6",chevronRight:"M9 18l6-6-6-6",bell:"M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0",
 home:"M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",split:"M16 3h5v5M8 3H3v5M21 3l-7 7M3 3l7 7M12 12v9",
 receipt:"M4 2v20l3-2 3 2 3-2 3 2 3-2 2 2V2l-2 2-3-2-3 2-3-2-3 2zM8 8h8M8 12h8M8 16h5",users:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
 vault:"M3 5h18v14H3zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M12 9v1M12 14v1M3 9h2M3 15h2",transfer:"M17 3l4 4-4 4M21 7H9M7 21l-4-4 4-4M3 17h12",
 more:"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",grid:"M5 12h.01M12 12h.01M19 12h.01M5 6h.01M12 6h.01M19 6h.01",
 info:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 16v-4M12 8h.01",alert:"M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0M12 9v4M12 17h.01",
 check:"M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4L12 14l-3-3",x:"M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M15 9l-6 6M9 9l6 6",
 chat:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 10h.01M12 10h.01M16 10h.01",shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10M9 12l2 2 4-4",
 card:"M2 5h20v14H2zM2 10h20",plus:"M12 5v14M5 12h14",scan:"M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"};
function Icon(p){var size=p.size||20;return h("svg",{width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:p.strokeWidth||1.8,strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":true,className:p.className},h("path",{d:P[p.name]||""}));}
Icon.names=Object.keys(P);
function Button(p){var v=p.variant||"primary";var rest=Object.assign({},p);delete rest.variant;delete rest.block;delete rest.className;
 return h("button",Object.assign({type:"button",className:cx("ss","ss-btn","ss-btn--"+v,p.block&&"ss-btn--block",p.className)},rest));}
function fmt(c){var n=Math.abs(c)/100;return n.toLocaleString("en-SG",{minimumFractionDigits:2,maximumFractionDigits:2});}
function Money(p){var size=p.size||"sm";return h("span",{className:cx("ss-money","ss-num","ss-money--"+size,p.className)},p.currency!==false&&h("span",{className:"ss-money__ccy"},p.currency||"SGD"),(p.cents<0?"−":"")+fmt(p.cents));}
function Card(p){var T=p.onClick?"button":"div";return h(T,{type:p.onClick?"button":undefined,onClick:p.onClick,className:cx("ss","ss-card",p.className),style:p.style},
 p.title&&h("p",{className:"ss-card__title"},p.title,p.count!=null&&h("span",{className:"ss-chip"},p.count)),
 p.meta&&h("p",{className:"ss-card__meta"},p.meta),
 p.cents!=null&&h("div",{className:"ss-card__amount"},h(Money,{cents:p.cents,size:p.amountSize||"lg"})),p.children);}
function Badge(p){if(p.tone==="new")return h("span",{className:"ss ss-new"},p.children||"NEW");if(p.tone==="dot")return h("span",{className:"ss-dot",role:"status","aria-label":p.label||"New"});return h("span",{className:"ss ss-chip"},p.children);}
function Avatar(p){var s=p.size||32;var name=p.name||"?";var ini=name.split(" ").map(function(x){return x[0];}).join("").slice(0,2);
 return h("span",{className:"ss ss-avatar","aria-label":name,style:{width:s,height:s,fontSize:Math.round(s*.38),background:p.color||"var(--avatar-unknown)"}},ini);}
Avatar.Stack=function(p){return h("span",{className:"ss-avatars"},p.children);};
function PositionLabel(p){var b=p.balance;if(b===0)return h("span",{className:"ss ss-pos ss-pos--settled"},"Settled");
 if(b<0)return h("span",{className:"ss ss-pos ss-pos--owe"},"You owe SGD "+fmt(b));return h("span",{className:"ss ss-pos ss-pos--owed"},"You are owed SGD "+fmt(b));}
var BI={info:"info",warn:"alert",error:"x",success:"check"};
function Banner(p){var t=p.tone||"info";return h("div",{className:cx("ss","ss-banner","ss-banner--"+t),role:t==="error"?"alert":"status"},h(Icon,{name:BI[t],size:18}),h("div",null,p.children));}
function SectionTitle(p){return h("h2",{className:cx("ss","ss-section",p.plain&&"ss-section--plain")},p.children);}
function ListRow(p){return h("button",{type:"button",onClick:p.onClick,className:cx("ss","ss-row",p.selected&&"ss-row--selected")},
 p.leading,h("span",{className:"ss-row__body"},p.caption&&h("span",{className:"ss-row__caption"},p.caption),h("span",{className:p.caption?"ss-row__value":"ss-row__label"},p.label)),
 p.trailing,p.chevron!==false&&h(Icon,{name:"chevronRight",size:18,className:"ss-row__chev"}));}
function QuickAction(p){return h("button",{type:"button",onClick:p.onClick,className:cx("ss","ss-qa",p.variant==="tile"&&"ss-qa--tile")},
 h("span",{className:"ss-qa__disc"},h(Icon,{name:p.icon,size:p.variant==="tile"?22:24}),p.dot&&h("span",{className:"ss-dot"}),p.isNew&&h("span",{className:"ss-new"},"NEW")),p.label);}
function ScreenHeader(p){return h("header",{className:"ss ss-header"},
 p.onBack?h("button",{className:"ss-icon-btn","aria-label":"Back",onClick:p.onBack},h(Icon,{name:"chevronLeft",size:22})):h("span",{style:{width:36}}),
 h("h1",{className:"ss-header__title"},p.title),p.action||h("span",{style:{width:36}}));}
function HeroHeader(p){return h("div",{className:"ss ss-hero"},
 h("div",{className:"ss-hero__bar"},h("button",{className:"ss-icon-btn","aria-label":"Notifications"},h(Icon,{name:"bell",size:22}),p.unread&&h("span",{className:"ss-dot",style:{background:"var(--on-brand)"}})),h("span",{style:{flex:1}}),
  h("button",{className:"ss-icon-btn","aria-label":"Messages"},h(Icon,{name:"chat",size:22})),p.action),
 h("p",{className:"ss-hero__greeting"},p.greeting),p.sub&&h("p",{className:"ss-hero__sub"},p.sub));}
function TabBar(p){return h("nav",{className:"ss ss-tabs","aria-label":"Main"},(p.items||[]).map(function(it){
 return h("button",{key:it.id,type:"button",className:"ss-tab","aria-current":it.id===p.active?"page":undefined,onClick:function(){p.onChange&&p.onChange(it.id);}},h(Icon,{name:it.icon,size:24}),it.label);}));}
function Field(p){return h("label",{className:"ss ss-field"},h("span",{className:"ss-field__label"},p.label),
 h("input",Object.assign({className:"ss-input"},p.inputProps)),p.hint&&h("span",{className:"ss-field__hint"},p.hint));}
window.SmartSplit={Button:Button,Card:Card,Money:Money,Badge:Badge,Avatar:Avatar,PositionLabel:PositionLabel,Banner:Banner,SectionTitle:SectionTitle,ListRow:ListRow,QuickAction:QuickAction,ScreenHeader:ScreenHeader,HeroHeader:HeroHeader,TabBar:TabBar,Field:Field,Icon:Icon};
})();
