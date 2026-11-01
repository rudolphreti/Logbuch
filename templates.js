export const W = 1054, H = 1492;
export const pages = ['28b87368-8164-4786-9312-609a35903d29.png', '1d9d7d11-1378-4f85-97c3-d5efe4d72e5c.png'];
// Paths trace the inner edges so the printed decorations remain visible.
// Both artworks use native 1054 × 1492 coordinates.
export const frames = [
 { page:0, name:'Wyruszamy w podróż', shape:'Prostokąt', x:126,y:267,w:188,h:202,path:'M126 267 L314 267 L314 470 Q220 464 126 468 Z' },
 ...[
  {name:'Pierwsza przygoda',shape:'Ozdobna ramka',x:120,y:217,w:323,h:240,
   path:'M120 299 L392 217 L443 381 L170 457 Z'},
  {name:'Widok z pokładu',shape:'Lina',x:609,y:230,w:251,h:228,
   path:'M666 230 L702 230 L741 242 L782 255 L827 271 L845 282 L858 296 L860 302 L858 328 L849 358 L840 388 L837 400 L832 410 L828 428 L823 438 L815 448 L795 458 L774 458 L736 448 L708 438 L683 428 L656 418 L631 408 L616 398 L614 389 L609 375 L609 361 L619 331 L629 301 L639 271 L655 241 Z'},
  {name:'Mały wielki moment',shape:'Koło',x:178,y:523,w:244,h:224,
   path:'M422 635 C422 697 367 747 300 747 C233 747 178 697 178 635 C178 573 233 523 300 523 C367 523 422 573 422 635 Z'},
  {name:'Na nieznanym lądzie',shape:'Pergamin',x:540,y:500,w:395,h:292,
   path:'M580 500 L595 509 L608 507 L625 520 L645 520 L661 537 L680 536 L697 550 L713 541 L732 545 L753 550 L769 550 L784 561 L803 559 L820 570 L839 567 L856 578 L873 578 L889 585 L910 578 L925 589 Q913 622 935 648 L930 664 L934 680 L925 696 L931 713 L924 731 L931 747 L924 764 L931 781 L917 792 L901 785 L884 785 L869 777 L849 780 L836 771 L818 775 L804 765 L788 762 L774 764 L758 757 L741 757 L725 748 L711 752 L694 742 L679 745 L661 738 L645 740 L628 730 L609 734 L594 726 L578 730 L563 720 L556 709 L548 705 L540 686 L544 671 L547 655 L554 640 L549 628 L559 613 L558 599 L566 584 L560 572 L570 557 L566 543 L576 528 L574 513 Z'},
  {name:'Skarby po drodze',shape:'Płótno',x:182,y:823,w:288,h:195,
   path:'M182 876 L434 823 L470 966 L211 1018 Z'},
  {name:'Wspólne odkrycia',shape:'Muszla',x:573,y:792,w:379,h:280,
   path:'M587 906 Q573 892 589 878 Q577 863 601 849 Q595 836 621 825 Q621 812 646 814 Q648 800 674 807 Q688 792 710 805 Q728 792 745 809 Q766 803 783 821 Q805 814 817 836 Q842 835 850 860 Q875 861 880 887 Q901 891 902 912 Q921 920 917 940 Q937 949 928 970 Q948 987 938 1008 Q952 1025 941 1037 Q928 1046 916 1037 L866 1032 Q839 1041 815 1057 Q791 1067 780 1057 Q754 1072 733 1059 Q713 1066 705 1048 Q679 1054 670 1029 L651 1015 Q629 1018 627 1001 L619 970 Q604 955 607 938 Q583 937 587 919 Z'},
  {name:'Chwila do zapamiętania',shape:'Drewno',x:180,y:1088,w:283,h:205,
   path:'M180 1145 L428 1088 L463 1237 L214 1293 Z'},
  {name:'Najlepsze wspomnienie',shape:'Deska',x:601,y:1148,w:199,h:153,
   path:'M626 1148 L800 1187 L797 1201 L785 1209 L786 1224 L776 1235 L779 1249 L768 1260 L770 1276 L758 1286 L761 1301 L605 1268 L610 1254 L601 1243 L608 1228 L602 1217 L611 1204 L607 1192 L618 1178 L613 1166 Z'}
 ].map(frame=>({...frame,page:1}))
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
 ...[
  [344,466,166,16], [638,472,138,16], [227,793,190,17], [552,746,138,16],
  [277,1048,135,16], [697,1099,130,15], [336,1318,168,16], [620,1357,174,17]
 ].map(([x,y,w,h],i)=>({id:`caption${i+1}`,page:1,label:`Podpis pod zdjęciem ${i+2}`,x,y,w,h,size:12,max:60})),
 {id:'story',page:1,label:'Jeszcze jedna historia…',x:372,y:1374,w:620,h:56,size:20,line:30,max:400}
];
