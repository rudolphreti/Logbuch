export const W = 1054, H = 1492;
export const pages = ['28b87368-8164-4786-9312-609a35903d29.png', 'template-page-2.jpg'];
// Paths trace the inner edges so the printed decorations remain visible.
// Page two uses the uploaded 904 × 1280 artwork unchanged. Convert its native
// coordinates to the shared export canvas; first-page coordinates stay intact.
const SX = W / 904, SY = H / 1280;
function secondFrame(frame) {
  return { ...frame, page: 1, x: frame.x * SX, y: frame.y * SY,
    w: frame.w * SX, h: frame.h * SY,
    path: frame.path.replace(/(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g,
      (_, x, y) => `${(Number(x) * SX).toFixed(3)} ${(Number(y) * SY).toFixed(3)}`) };
}
function secondField(field) {
  return { ...field, page: 1, x: field.x * SX, y: field.y * SY,
    w: field.w * SX, h: field.h * SY, size: field.size * SY,
    ...(field.line ? { line: field.line * SY } : {}) };
}
export const frames = [
 { page:0, name:'Wyruszamy w podróż', shape:'Prostokąt', x:126,y:267,w:188,h:202,path:'M126 267 L314 267 L314 470 Q220 464 126 468 Z' },
 ...[
  {name:'Pierwsza przygoda',shape:'Ozdobna ramka',x:128,y:182,w:276,h:193,
   path:'M128 227 L375 182 L404 332 L158 375 Z'},
  {name:'Widok z pokładu',shape:'Lina',x:516,y:191,w:212,h:185,
   path:'M550 191 Q625 198 728 217 L707 376 Q617 366 531 349 Q516 338 522 318 L537 247 Z'},
  {name:'Mały wielki moment',shape:'Koło',x:117,y:449,w:227,h:201,
   path:'M344 549 C344 606 294 650 231 650 C168 650 117 607 117 549 C117 491 167 449 231 449 C294 449 344 492 344 549 Z'},
  {name:'Na nieznanym lądzie',shape:'Pergamin',x:449,y:437,w:367,h:204,
   path:'M471 444 L481 447 L488 437 L500 449 L511 447 L516 457 L535 449 L544 460 L554 447 L567 451 L580 449 L592 455 L607 451 L617 453 L630 450 L642 455 L655 449 L669 453 L683 446 L699 449 L714 441 L729 444 L745 437 L770 437 Q774 467 806 481 L816 495 L809 517 L813 527 L802 540 L808 554 L798 566 L804 582 L797 597 L803 613 L793 625 L802 640 L784 638 L773 630 L757 634 L741 630 L728 633 L711 629 L697 633 L683 629 L670 635 L654 630 L639 634 L625 628 L612 633 L598 629 L584 635 L572 630 L561 635 L550 630 L537 637 L524 632 L512 639 L499 634 L489 641 L470 636 Q473 609 449 603 L451 587 L456 576 L451 563 L459 550 L456 537 L463 524 L460 509 L467 496 L462 484 L472 470 L467 456 Z'},
  {name:'Skarby po drodze',shape:'Płótno',x:145,y:738,w:232,h:130,
   path:'M150 738 Q253 751 373 738 L377 861 Q260 872 151 862 L145 759 Z'},
  {name:'Wspólne odkrycia',shape:'Muszla',x:483,y:695,w:339,h:231,
   path:'M490 833 Q482 820 497 809 Q489 792 507 784 Q504 764 523 760 Q524 738 546 739 Q552 717 573 723 Q584 702 606 710 Q620 690 640 704 Q657 686 675 704 Q697 694 709 716 Q734 708 742 732 Q766 732 771 753 Q792 760 789 782 Q810 794 805 812 Q822 830 808 842 Q815 858 794 864 Q776 865 759 884 L736 907 Q708 911 695 916 Q675 902 656 915 Q633 912 619 903 Q599 913 579 899 Q559 903 551 880 L533 866 Q505 868 507 851 Q486 849 490 833 Z'},
  {name:'Chwila do zapamiętania',shape:'Drewno',x:151,y:978,w:232,h:122,
   path:'M151 978 Q262 984 382 979 L383 1099 Q260 1094 151 1097 Z'},
  {name:'Najlepsze wspomnienie',shape:'Deska',x:492,y:1005,w:174,h:116,
   path:'M500 1008 L654 1005 L663 1017 L658 1030 L666 1042 L660 1057 L665 1070 L659 1086 L664 1100 L652 1118 L501 1121 L493 1110 L498 1097 L492 1084 L499 1069 L493 1054 L501 1040 L496 1023 Z'}
 ].map(secondFrame)
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
  [267,399,150,16], [550,411,140,14], [150,679,190,16], [513,655,234,14],
  [174,906,180,16], [566,947,158,16], [169,1156,210,16], [500,1158,172,15]
 ].map(([x,y,w,h],i)=>secondField({id:`caption${i+1}`,label:`Podpis pod zdjęciem ${i+2}`,x,y,w,h,size:11,max:60})),
 secondField({id:'story',label:'Jeszcze jedna historia…',x:313,y:1179,w:535,h:48,size:16,line:26,max:400})
];
