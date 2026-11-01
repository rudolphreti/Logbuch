export const W = 1054, H = 1492;
export const pages = ['28b87368-8164-4786-9312-609a35903d29.png', '14cea7f1-270b-4b57-9eb0-6372c31789bb.png'];
// Coordinates follow the original 1054 × 1492 templates. Paths trace the inner
// edges so the printed rope, wood, parchment and shell remain visible.
export const frames = [
 { page:0, name:'Wyruszamy w podróż', shape:'Prostokąt', x:126,y:267,w:188,h:202,path:'M126 267 L314 267 L314 470 Q220 464 126 468 Z' },
 { page:1, name:'Pierwsza przygoda', shape:'Pergamin', x:145,y:265,w:407,h:247,path:'M188 265 L235 268 L260 276 L283 267 L323 285 L360 280 L391 292 L431 291 L468 304 L494 297 Q493 342 552 347 L543 369 L550 391 L536 414 L542 441 L529 462 L532 483 L522 509 L480 501 L452 497 L427 491 L390 491 L358 483 L320 483 L292 474 L270 483 L243 472 L216 475 L200 462 L177 468 L169 448 L151 449 L155 421 L145 414 L157 387 L149 376 L163 353 L160 336 L175 319 L168 303 L180 289 Z' },
 { page:1, name:'Widok z pokładu', shape:'Koło', x:634,y:286,w:242,h:242,path:'M876 407 A121 121 0 1 1 634 407 A121 121 0 1 1 876 407 Z' },
 { page:1, name:'Mały wielki moment', shape:'Ozdobna ramka', x:139,y:582,w:285,h:208,path:'M139 582 L412 601 L424 790 L145 768 Z' },
 { page:1, name:'Na nieznanym lądzie', shape:'Drewno', x:548,y:637,w:310,h:143,path:'M554 637 L855 640 L853 779 L548 775 Z' },
 { page:1, name:'Skarby po drodze', shape:'Lina', x:79,y:875,w:216,h:187,path:'M112 875 Q166 883 205 875 L264 879 Q292 885 293 909 L294 1038 Q290 1061 267 1062 L108 1060 Q80 1057 80 1030 L79 922 Q94 907 112 875 Z' },
 { page:1, name:'Wspólne odkrycia', shape:'Deska', x:365,y:896,w:554,h:99,path:'M388 896 L891 897 L899 913 L918 914 L914 934 L919 953 L901 966 L908 981 L879 993 L392 995 L370 985 L377 971 L365 954 L375 938 L370 918 Z' },
 { page:1, name:'Chwila do zapamiętania', shape:'Płótno', x:122,y:1110,w:456,h:160,path:'M122 1162 L549 1110 L578 1228 L151 1270 Z' },
 { page:1, name:'Najlepsze wspomnienie', shape:'Muszla', x:655,y:1032,w:328,h:248,path:'M660 1168 Q661 1151 673 1151 Q663 1126 685 1124 Q679 1100 703 1103 Q701 1076 727 1080 Q729 1058 750 1067 Q756 1044 777 1054 Q787 1037 804 1048 Q821 1032 838 1049 Q860 1041 871 1063 Q892 1056 901 1080 Q924 1078 929 1101 Q949 1103 947 1128 Q971 1136 959 1155 Q983 1170 963 1187 Q966 1208 943 1209 L884 1260 Q866 1274 844 1264 Q820 1280 801 1265 Q775 1275 756 1262 L700 1213 Q673 1217 674 1195 Q655 1192 660 1168 Z' }
];
export const fields = [
 {id:'host',page:0,label:'Z wizytą u',x:557,y:305,w:440,h:32,size:23,max:80},
 {id:'from',page:0,label:'Od',x:485,y:381,w:222,h:32,size:23,max:40},
 {id:'to',page:0,label:'Do',x:772,y:381,w:225,h:32,size:23,max:40},
 {id:'companion',page:0,label:'Towarzysz podróży',x:640,y:459,w:358,h:32,size:23,max:80},
 {id:'friday',page:0,label:'Piątek · co się wydarzyło?',x:244,y:602,w:712,h:105,size:22,line:37,max:400},
 {id:'saturday',page:0,label:'Sobota · co się wydarzyło?',x:244,y:817,w:712,h:105,size:22,line:37,max:400},
 {id:'sunday',page:0,label:'Niedziela · co się wydarzyło?',x:244,y:1034,w:712,h:105,size:22,line:37,max:400},
 {id:'treasure',page:0,label:'Nasz największy skarb',x:294,y:1236,w:702,h:68,size:22,line:38,max:200},
 ...Array.from({length:8},(_,i)=>({id:`caption${i+1}`,page:1,label:`Podpis pod zdjęciem ${i+2}`,x:[185,622,169,584,110,451,298,663][i],y:[501,539,815,821,1080,1024,1277,1299][i],w:[168,232,198,190,168,243,224,178][i],h:20,size:15,max:60})),
 {id:'story',page:1,label:'Jeszcze jedna historia…',x:66,y:1359,w:681,h:56,size:21,line:26,max:400}
];
