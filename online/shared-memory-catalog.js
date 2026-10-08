// Catalogue commun des Souvenirs — source issue du jeu principal.
// art(number) est fourni par chaque interface (jeu classique / duel en ligne).
export function createMemoryCards(art){
const memoryCards=[
 {id:'target',name:'Cible sphérique',icon:'◉',accent:'#66cbd0',tone:'positive',image:art(46),text:'Choisissez une carte adverse en jeu et déplacez-la vers la case vide de votre choix.'},
 {id:'fire',name:'Trait de feu raté',icon:'🔥',accent:'#e76a43',tone:'negative',image:art(51),text:'Choisissez l’une de vos cartes en jeu. Elle perd 1 point dans chacune de ses quatre valeurs.'},
 {id:'spider',name:'On ne tue pas les araignées blanches !',icon:'🕸',accent:'#d9e8df',tone:'negative',text:'Votre dernière carte posée quitte le plateau et revient dans votre main.'},
 {id:'rock',name:'Jet de caillou habile',icon:'◆',accent:'#a8c96f',tone:'positive',image:art(20),text:'Choisissez l’une de vos cartes en jeu. Elle gagne 1 point dans chacune de ses quatre valeurs.'},
 {id:'cheese',name:'Vous avez du fromage ?',icon:'◒',accent:'#f0c85c',tone:'positive',image:art(53),text:'Votre adversaire ne voit plus sa main et devra choisir sa prochaine carte à l’aveugle.'},
 {id:'reunion',name:'Retrouvailles',icon:'↔',accent:'#db8cc8',tone:'positive',text:'Choisissez une carte de votre main à échanger contre une carte aléatoire de la main adverse.'},
 {id:'stuck',name:'Je suis coincé',icon:'⌁',accent:'#6f9cc7',tone:'negative',image:art(19),text:'Votre main reste cachée jusqu’à ce que vous posiez une carte sur le plateau.'},
 {id:'master',name:'LE MAÎTRE DU JEU',icon:'★',accent:'#e7bf4f',tone:'joker',text:'Vous ne pouvez plus piocher. Une fois, vous pourrez annuler un Souvenir adverse ou en dupliquer l’effet.'},
 {id:'rest',name:'Un repos mérité',icon:'❦',accent:'#68b6a4',tone:'neutral',image:art(52),text:'Un instant de calme : aucun effet ne se produit.'}
];
return memoryCards;
}
export function createMemoryDeckIds(){return ['target','fire','spider','rock','cheese','reunion','stuck'].flatMap(id=>[id,id]).concat(['master'],Array(10).fill('rest'))}
