export const W = 1054, H = 1492;
export const pages = ['1a4a62cc-f6f3-4fad-b27c-0229b282b101.png', '5ea0771d-2f7f-4574-a89c-82a7d4339f16.png'];
// Coordinates use the export canvas space. Source artwork is scaled to this size.
// Masks stay inside the decorations; the small rope frame is also a photo slot.
export const frames = [
 {page:0,name:'Z wizytą u',shape:'Kości',x:82,y:138,w:310,h:222,path:'M91 140 Q230 145 390 132 L388 353 Q235 369 82 352 Z'},
 ...[
  {name:'Pierwsza przygoda',shape:'Żagiel',x:76,y:106,w:552,h:407,path:'M122 171 Q330 153 609 97 Q556 253 603 389 Q444 380 304 442 Q192 458 76 513 Q117 332 122 171 Z'},
  {name:'Widok z pokładu',shape:'Iluminator',x:676,y:98,w:285,h:300,path:'M961 248 C961 331 897 398 819 398 C740 398 676 331 676 248 C676 165 740 98 819 98 C897 98 961 165 961 248 Z'},
  {name:'Mały wielki moment',shape:'Kości',x:101,y:624,w:179,h:235,path:'M101 644 L263 624 L280 846 L118 859 Z'},
  {name:'Na nieznanym lądzie',shape:'Muszla',x:363,y:492,w:318,h:299,path:'M520 492 Q548 491 568 533 Q612 516 634 563 Q666 569 668 611 Q696 639 674 676 Q678 705 643 722 Q588 752 538 791 Q493 780 450 743 Q413 720 382 690 Q357 668 371 637 Q361 606 391 588 Q394 552 429 554 Q445 517 478 536 Q491 499 520 492 Z'},
  {name:'Skarby po drodze',shape:'Pergamin',x:707,y:527,w:275,h:300,path:'M741 527 L978 566 L969 587 L981 603 L969 627 L975 648 L963 670 L969 693 L957 715 L961 741 L950 764 L953 794 L941 827 L707 780 L716 759 L709 737 L721 714 L715 692 L727 670 L721 648 L734 624 L728 602 L739 579 L733 557 Z'},
  {name:'Wspólne odkrycia',shape:'Lina',x:389,y:847,w:249,h:127,path:'M416 853 Q450 841 490 861 Q527 865 566 847 Q603 853 617 874 Q650 901 627 924 Q590 940 566 964 Q546 982 518 969 Q476 958 443 962 Q407 964 393 936 Q379 913 398 875 Z'},
  {name:'Chwila do zapamiętania',shape:'Obroża',x:80,y:1065,w:423,h:323,path:'M503 1226 C503 1315 408 1388 291 1388 C174 1388 80 1315 80 1226 C80 1137 174 1065 291 1065 C408 1065 503 1137 503 1226 Z'},
  {name:'Najlepsze wspomnienie',shape:'Buda',x:657,y:1026,w:228,h:225,path:'M885 1139 C885 1201 834 1251 771 1251 C708 1251 657 1201 657 1139 C657 1077 708 1026 771 1026 C834 1026 885 1077 885 1139 Z'}
 ].map(frame=>({...frame,page:1}))
];

export const fields = [
 {id:'host',page:0,label:'Z wizytą u',x:487,y:281,w:514,h:42,size:27,max:80},
 {id:'from',page:0,label:'Od',x:570,y:369,w:161,h:34,size:23,max:40},
 {id:'to',page:0,label:'Do',x:823,y:369,w:177,h:34,size:23,max:40},
 {id:'friday',page:0,label:'Piątek · co się wydarzyło?',x:116,y:529,w:810,h:162,size:25,line:42,max:400},
 {id:'saturday',page:0,label:'Sobota · co się wydarzyło?',x:116,y:782,w:810,h:162,size:25,line:42,max:400},
 {id:'sunday',page:0,label:'Niedziela · co się wydarzyło?',x:116,y:1027,w:810,h:162,size:25,line:41,max:400},
 {id:'treasure',page:0,label:'Najpiękniejsze przeżycie z Pepperem',x:363,y:1321,w:635,h:78,size:24,line:40,max:200}
];
