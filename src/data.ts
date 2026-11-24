// Static game data: products, tiers, roles, areas, events, perks.
// Display strings go through TR() so the active language is applied at load time.
import { TR } from './i18n';

export const DAY=60; // Sekunden pro Spieltag
export const EXTRAS=[
 {id:'ketchup',n:'Ketchup',ek:0.06,v:0.5,t:0.26,p:['pommes','wurst','vwurst','burger']},
 {id:'mayo',n:'Mayo',ek:0.08,v:0.5,t:0.22,p:['pommes','burger','wrap','halloumi']},
 {id:'vmayo',n:TR('Vegane Mayo'),ek:0.12,v:0.6,t:0.1,p:['pommes','falafel','vwurst']},
 {id:'curry',n:TR('Currysauce'),ek:0.1,v:0.7,t:0.2,p:['wurst','vwurst','pommes']},
 {id:'zwiebeln',n:TR('Röstzwiebeln'),ek:0.07,v:0.4,t:0.12,p:['wurst','vwurst','burger']},
 {id:'doppelt',n:TR('Doppelt Fleisch'),rel:[0.55,0.45],t:0.1,w:0.3,p:['burger','wurst','steak','schnitzel','halloumi','falafel'],names:{wurst:TR('Zweite Wurst'),steak:TR('Größeres Steak'),schnitzel:TR('Doppeltes Schnitzel'),halloumi:TR('Doppelt Halloumi'),falafel:TR('Extra Falafel')}},
 {id:'kaese',n:TR('Extra Käse'),ek:0.25,v:1.0,t:0.15,p:['burger','pasta','wrap']},
 {id:'bacon',n:'Bacon',ek:0.4,v:1.4,t:0.12,p:['burger']},
 {id:'salat',n:TR('Beilagensalat'),ek:0.5,v:2.2,t:0.15,p:['schnitzel','steak','fisch','pasta','risotto']},
 {id:'avocado',n:'Avocado',ek:0.6,v:1.6,t:0.14,p:['bowl','wrap','falafel']},
 {id:'jaeger',n:TR('Jägersoße'),ek:0.3,v:1.2,t:0.2,p:['schnitzel','spaetzle']},
 {id:'naan',n:TR('Naan-Brot'),ek:0.3,v:1.5,t:0.2,p:['curry']},
 {id:'trueffel',n:TR('Trüffelöl'),ek:0.8,v:2.5,t:0.08,p:['pasta','risotto','pommes'],minT:3},
 {id:'weinbeg',n:TR('Weinbegleitung'),ek:6,v:18,t:0.25,p:['menu3','vmenu','degu','gdeg']},
 {id:'gross',n:TR('Großes Glas'),ek:0.3,v:1.2,t:0.15,p:['bier','soft']}];
export const SIDES={pommes:{n:TR('Pommes')},salat:{n:TR('Beilagensalat'),ek:0.5,v:2.2,w:0.3}};
export const COMBO_MAX=[1,2,3,4,5,6];
export const QN=[TR('Einfach'),TR('Solide'),TR('Gut'),TR('Fein'),TR('Spitzenklasse')];
export const QV=[1,1.25,1.5,1.85,2.2], QC=[1,1.22,1.45,1.75,2.1], QW=[1,1.1,1.2,1.32,1.45];
export const QCOST=[0,500,4500,28000,160000];
export const TIERS=[
 {n:TR('Straßenstand'),cost:0,rent:8,cook:1,help:0,serv:0,bar:0,lead:0,store:180,dem:65,q:6,maxQ:2,exp:1},
 {n:TR('Foodtruck'),cost:1500,rent:40,cook:2,help:1,serv:0,bar:0,lead:0,store:420,dem:105,q:9,maxQ:2,exp:1},
 {n:TR('Imbiss'),cost:6500,rent:260,cook:3,help:1,serv:1,bar:0,lead:1,store:1100,dem:170,q:12,maxQ:3,exp:2},
 {n:'Bistro',cost:32000,rent:2200,cook:4,help:2,serv:3,bar:1,lead:1,store:3200,dem:250,q:18,maxQ:4,exp:3},
 {n:'Restaurant',cost:160000,rent:12000,cook:7,help:4,serv:6,bar:2,lead:1,store:9000,dem:360,q:26,maxQ:5,exp:4},
 {n:TR('Gourmet-Restaurant'),cost:800000,rent:32000,cook:10,help:6,serv:10,bar:3,lead:1,store:22000,dem:430,q:32,maxQ:5,exp:5}
];
export const PRODS=[
 {id:'wurst',n:TR('Bratwurst im Brötchen'),t:0,ek:1.15,v:3.0,w:1.0,pop:1.0},
 {id:'vwurst',n:TR('Vegane Bratwurst'),t:0,ek:1.35,v:3.2,w:1.0,pop:0.7,diet:'vegan'},
 {id:'pommes',n:TR('Pommes'),t:0,ek:0.85,v:2.4,w:0.8,pop:0.8,diet:'vegan',side:1},
 {id:'burger',n:'Burger',t:1,ek:2.1,v:5.5,w:1.4,pop:1.2},
 {id:'wrap',n:TR('Hähnchen-Wrap'),t:1,ek:1.8,v:4.8,w:1.1,pop:0.7},
 {id:'falafel',n:TR('Falafel-Wrap'),t:1,ek:1.5,v:5.0,w:1.2,pop:0.7,diet:'vegan'},
 {id:'halloumi',n:TR('Halloumi-Burger'),t:1,ek:2.3,v:6.0,w:1.4,pop:0.7,diet:'veggie'},
 {id:'schnitzel',n:TR('Schnitzel mit Beilage'),t:2,ek:3.5,v:9.0,w:1.8,pop:1.1},
 {id:'bowl',n:TR('Salat-Bowl mit Feta'),t:2,ek:2.7,v:7.5,w:1.0,pop:0.7,diet:'veggie'},
 {id:'curry',n:TR('Gemüse-Curry'),t:2,ek:2.2,v:8.0,w:1.4,pop:0.7,diet:'vegan'},
 {id:'spaetzle',n:TR('Käsespätzle'),t:2,ek:2.4,v:8.5,w:1.5,pop:0.8,diet:'veggie'},
 {id:'pasta',n:TR('Hausgemachte Pasta'),t:3,ek:3.8,v:11,w:1.5,pop:1.0,diet:'veggie'},
 {id:'risotto',n:TR('Pilzrisotto'),t:3,ek:3.6,v:12,w:1.7,pop:0.7,diet:'veggie'},
 {id:'steak',n:TR('Rumpsteak'),t:3,ek:8.5,v:20,w:2.2,pop:0.8},
 {id:'fisch',n:TR('Fischfilet'),t:4,ek:7.5,v:19,w:2.2,pop:0.8},
 {id:'menu3',n:TR('3-Gänge-Menü'),t:4,ek:13,v:32,w:3.6,pop:0.9},
 {id:'vmenu',n:TR('Veganes 3-Gänge-Menü'),t:4,ek:11,v:30,w:3.8,pop:0.6,diet:'vegan'},
 {id:'degu',n:TR('Degustationsmenü'),t:5,ek:29,v:70,w:6,pop:0.8},
 {id:'gdeg',n:TR('Gemüse-Degustation'),t:5,ek:24,v:66,w:6.2,pop:0.6,diet:'vegan'},
 {id:'soft',n:TR('Softdrink'),t:0,ek:0.6,v:2.2,pop:1,drink:1},
 {id:'bier',n:TR('Bier vom Fass'),t:2,ek:1.0,v:3.4,pop:0.9,drink:1},
 {id:'wein',n:TR('Wein im Glas'),t:3,ek:2.2,v:6.5,pop:0.7,drink:1},
 {id:'cocktail',n:'Cocktail',t:3,ek:2.6,v:8.5,pop:0.6,drink:1,bar:1}
];
export const ROLES=[
 {id:'cook',n:TR('Koch'),w:50,d:TR('Kocht. Können bestimmt Tempo und wie das Essen ankommt.')},
 {id:'help',n:TR('Küchenhilfe'),w:28,d:TR('+12 % Küchenleistung, Ordnung hält länger.')},
 {id:'serv',n:TR('Bedienung'),w:38,d:TR('Bedient bei normaler Leistung rund 90 Gäste am Tag.')},
 {id:'bar',n:TR('Barkeeper'),w:44,d:TR('+130 Getränke am Tag, mehr Bestellungen, Cocktails.')},
 {id:'lead',n:TR('Restaurantleitung'),w:130,d:TR('Bestellt Ware nach, lässt reparieren und hält den Laden offen, wenn du weg bist.')}
];
export const MACH=[
 {id:'herd',n:TR('Kochstation'),d:TR('+30 % Küchenleistung je Stufe'),base:250,t:0},
 {id:'kuehl',n:TR('Kühlung'),d:TR('+40 % Lagerplatz je Stufe, weniger Verderb'),base:180,t:0},
 {id:'bar',n:TR('Getränkestation'),d:TR('Schaltet Getränke frei, mehr Bestellungen je Stufe'),base:350,t:0},
 {id:'kasse',n:TR('Kassensystem'),d:TR('+20 % Service-Kapazität je Stufe'),base:500,t:2},
 {id:'spuel',n:TR('Spülstraße'),d:TR('Ordnung verfällt 10 % langsamer je Stufe'),base:700,t:2},
 {id:'extra',n:TR('Kaffee und Dessert'),d:TR('+5 % Umsatz pro Gast je Stufe'),base:900,t:2}
];
export const VEGA=[0.14,0.10,0.32,0.20,0.07,0.16,0.15,0.09,0.18,0.26,0.12,0.15],VEGAN_SHARE=0.4;
export const DIETN={veggie:'vegetarisch',vegan:'vegan'};
export const AREAS=[
 {n:TR('Marktplatz'),dem:1.0,rent:1.0,pay:1.0},
 {n:TR('Bahnhofsviertel'),dem:1.25,rent:1.3,pay:0.92},
 {n:TR('Uni-Campus'),dem:1.2,rent:0.9,pay:0.85},
 {n:TR('Altstadt'),dem:1.1,rent:1.4,pay:1.12},
 {n:TR('Gewerbepark'),dem:0.85,rent:0.6,pay:0.95},
 {n:TR('Hafenpromenade'),dem:0.95,rent:1.2,pay:1.15},
 {n:TR('Neustadt'),dem:1.0,rent:0.85,pay:0.97},
 {n:TR('Messegelände'),dem:1.3,rent:1.6,pay:1.05},
 {n:TR('Schlossviertel'),dem:0.8,rent:1.7,pay:1.3},
 {n:TR('Stadtpark'),dem:0.9,rent:0.8,pay:1.0},
 {n:TR('Flughafen'),dem:1.35,rent:2.0,pay:1.2},
 {n:TR('Einkaufszentrum'),dem:1.15,rent:1.5,pay:1.0}
];
export const HQS=[{n:TR('Kein Büro'),cost:0,daily:0},{n:TR('Büro'),cost:6000,daily:250},{n:TR('Verwaltung'),cost:30000,daily:900},{n:TR('Zentrale'),cost:150000,daily:3000},{n:TR('Konzernzentrale'),cost:600000,daily:9000}];
export const REGV=0.25; // Stammkunden kommen im Schnitt jeden vierten Tag
export const WM=[1,1.3,2.1,3.3,5,7.5];
export const FN=['Aylin','Jonas','Mira','Tobias','Elif','Lukas','Sofia','Marek','Hanna','Deniz','Paul','Ines','Kofi','Lena','Milan','Greta','Yusuf','Nora','Emil','Tamara','Ben','Carla','Ivo','Selin','Ole','Frieda','Samir','Jule','Anton','Rosa'];
export const LN=['Brandt','Yıldız','Hoffmann','Petrović','Schuster','Nowak','Kaya','Lindner','Okafor','Weber','Marino','Vogel','Demir','Kessler','Lang','Haas','Sommer','Bauer','Aksoy','Ritter','Popov','Engel','Kurz','Wolff'];
export const VENUES=[TR('Gasthof Adler'),TR('Hotel Krone'),TR('Brauhaus am Markt'),TR('Bistro Kleeblatt'),TR('Ratskeller'),'Pizzeria Vesuvio',TR('Kantine der Stadtwerke'),TR('Café Linde'),TR('Landhotel Seeblick'),TR('Grillhaus Feuerstelle')];
export const POS={cook:[TR('Beikoch'),TR('Jungkoch'),TR('Koch'),TR('Sous-Chef'),TR('Küchenchef')],help:[TR('Spülkraft'),TR('Küchenhilfe'),TR('Küchenhilfe')],serv:[TR('Aushilfe im Service'),TR('Servicekraft'),TR('Servicekraft'),TR('Chef de Rang')],bar:[TR('Thekenkraft'),TR('Barkeeper'),TR('Barchef')],lead:[TR('Schichtleitung'),TR('stellvertretende Betriebsleitung'),TR('Betriebsleitung'),TR('Restaurantleitung')]};
export const VAGUE=[TR('Mehrere Jahre in der Gastronomie, Stationen nicht näher benannt'),TR('Quereinstieg, vorher im Einzelhandel'),TR('Verschiedene Aushilfsjobs, „praktisch veranlagt“'),TR('Nach eigener Angabe viel Erfahrung, Nachweise werden nachgereicht')];
export const ZG=[TR('hat sich stets bemüht, den Anforderungen gerecht zu werden'),TR('im Großen und Ganzen zu unserer Zufriedenheit'),TR('zu unserer Zufriedenheit'),TR('zu unserer vollen Zufriedenheit'),TR('stets zu unserer vollen Zufriedenheit'),TR('stets zu unserer vollsten Zufriedenheit')];
export const TALK=[[TR('Weicht Fachfragen aus und wechselt das Thema.'),TR('Redet viel, sagt wenig zur Sache.'),TR('Sehr selbstbewusst, Details bleiben vage.')],[TR('Freundlich, bleibt bei Fachfragen allgemein.'),TR('Wirkt motiviert, etwas nervös.'),TR('Ordentlicher Eindruck ohne Höhen und Tiefen.')],[TR('Beantwortet Fachfragen knapp und sicher.'),TR('Fragt von sich aus nach Abläufen und Stoßzeiten.'),TR('Erzählt konkret von früheren Schichten.')]];
export const RAR=[
 {n:TR('Gewöhnlich'),pay:1,res:0,cap:1.35},
 {n:TR('Selten'),pay:1.25,res:0.25,cap:1.5,sk:[0.95,1.25]},
 {n:TR('Episch'),pay:1.6,res:0.45,cap:1.7,sk:[1.2,1.45]},
 {n:TR('Legendär'),pay:2.2,res:0.65,cap:1.9,sk:[1.45,1.7]},
 {n:'Ultra',pay:3.2,res:0.85,cap:2.2,sk:[1.8,2.1]}];
export const RAR_APP=[70,22,6.5,1.5,0],RAR_HH=[0,55.5,33,11,0.5]; // Ultra: etwa 1 von 100 Headhunter-Aufträgen
export const TRAIT={
 dieb:{n:TR('greift in die Kasse'),k:'bad',log:TR('wurde beim Griff in die Kasse beobachtet.'),z:TR('Das Arbeitsverhältnis endete kurzfristig im gegenseitigen Einvernehmen.'),t:TR('Fragt, wer abends die Kasse abrechnet.')},
 giftig:{n:TR('vergiftet das Betriebsklima'),k:'bad',log:TR('sorgt im Team für Dauerstreit, die anderen arbeiten schlechter.'),z:TR('Vertrat eigene Ansichten gegenüber Kollegen stets mit Nachdruck.'),t:TR('Spricht ausführlich über die Fehler des letzten Chefs.')},
 unzuv:{n:TR('fehlt häufig'),k:'warn',log:TR('erscheint auffällig oft nicht zur Schicht.'),z:TR('War um Pünktlichkeit bemüht.'),t:TR('Kam eine Viertelstunde zu spät zum Gespräch.')},
 schlampig:{n:TR('arbeitet schlampig'),k:'warn',log:TR('hinterlässt den Arbeitsplatz regelmäßig im Chaos.'),z:TR('Erledigte Aufgaben auf die eigene Art.'),t:TR('Unterlagen unvollständig und zerknittert.')},
 vorbild:{n:TR('zieht das Team mit'),k:'good',log:TR('erweist sich als Glücksgriff: Das ganze Team arbeitet besser.'),z:TR('Wir bedauern das Ausscheiden außerordentlich.'),t:TR('Hat sich vorab den Betrieb angesehen.')}
};
export const SEASONS=[TR('Frühling'),'Sommer',TR('Herbst'),'Winter'],SEASON_LEN=15;
export const WX={
 sonne:{n:TR('Sonnig'),out:1.1,in:1,drink:1.1,t:[16,24]},
 heiss:{n:TR('Heiß'),out:1.15,in:0.95,drink:1.35,t:[29,35]},
 wolken:{n:TR('Bewölkt'),out:1,in:1,drink:1,t:[8,17]},
 regen:{n:TR('Regen'),out:0.6,in:0.97,drink:0.9,t:[5,14]},
 sturm:{n:TR('Sturm'),out:0.35,in:0.8,drink:0.85,t:[4,12]},
 schnee:{n:TR('Schnee'),out:0.55,in:0.9,drink:0.9,t:[-4,1]},
 frost:{n:'Frost',out:0.75,in:1,drink:0.9,t:[-9,-2]}
};
export const WXP=[{sonne:.3,wolken:.35,regen:.28,sturm:.07},{sonne:.45,heiss:.25,wolken:.15,regen:.1,sturm:.05},{sonne:.2,wolken:.35,regen:.32,sturm:.13},{wolken:.35,regen:.15,schnee:.25,frost:.2,sturm:.05}];
export const SEASON_DEM=[[1,1],[1.12,1],[0.95,1],[0.82,1.04]],SEASON_PRICE=[1,0.96,1,1.08];
export const PTAG={vwurst:'grill',falafel:'kalt',halloumi:'grill',curry:'warm',spaetzle:'warm',risotto:'warm',vmenu:'warm',gdeg:'fein',wurst:'grill',pommes:'snack',burger:'grill',wrap:'kalt',schnitzel:'warm',bowl:'kalt',pasta:'warm',steak:'grill',fisch:'leicht',menu3:'warm',degu:'fein',soft:'kalt_d',bier:'bier',wein:'wein',cocktail:'kalt_d'};
export const CITYEV=[
 {id:'fest',n:TR('Stadtfest'),len:2,mult:2,pref:{wurst:1.5,burger:1.3,bier:1.6,soft:1.3},areas:[0,3,9,6]},
 {id:'fussball',n:TR('Fußballspiel'),len:1,mult:1.9,pref:{wurst:1.6,pommes:1.4,bier:1.8},areas:[7,1]},
 {id:'xmas',n:TR('Weihnachtsmarkt'),len:4,mult:1.6,pref:{wurst:1.5,wein:1.6,schnitzel:1.2},areas:[0,3],season:3},
 {id:'uni',n:TR('Semesterstart'),len:3,mult:1.6,pref:{burger:1.3,falafel:1.5,pommes:1.3,curry:1.3},areas:[2],price:0.9},
 {id:'messe',n:TR('Messe'),len:3,mult:1.8,pref:{steak:1.3,menu3:1.3,wein:1.3},areas:[7,11,10],pay:1.15},
 {id:'lauf',n:TR('Stadtlauf'),len:1,mult:1.7,pref:{bowl:1.6,soft:1.8,falafel:1.5,curry:1.3},areas:[9,5]},
 {id:'konzert',n:TR('Open-Air-Konzert'),len:1,mult:2.1,pref:{bier:1.7,cocktail:1.5,burger:1.3},areas:[5,9],season:1}
];
export const COMPN=['Smash Bros. Burger','Pasta Presto','Döner Royal','Frittenwerk','Curry-Kaiser','Bowl & Soul','Steakhaus Glut','Café Zeitlos','Pizza Napoli Express','Le Petit Bistro'];
export const SIGN={vwurst:TR('Rauchige Veggie-Wurst'),falafel:TR('Falafel nach Hausrezept'),halloumi:TR('Halloumi-Burger Spezial'),curry:TR('Curry der Woche'),spaetzle:TR('Allgäuer Käsespätzle'),risotto:TR('Steinpilz-Risotto'),vmenu:TR('Grünes Menü'),gdeg:TR('Garten-Degustation'),wurst:TR('Feuerwurst mit Senfkruste'),pommes:TR('Trüffel-Pommes'),burger:TR('Burger des Hauses'),wrap:TR('Streetwrap Spezial'),schnitzel:TR('Schnitzel nach Omas Art'),bowl:TR('Gartenbowl'),pasta:TR('Pasta der Saison'),steak:TR('Dry-Aged-Rumpsteak'),fisch:TR('Zander auf Linsen'),menu3:TR('Menü des Hauses'),degu:TR('Carte Blanche')};
export const CONTR={tag:{n:TR('Tagespreis'),d:TR('Du zahlst den aktuellen Marktpreis mit allen Schwankungen durch Markt und Jahreszeit.')},
  fest:{n:TR('Festpreis'),d:TR('30 Tage lang immer 5 % über dem Normalpreis, dafür keine Schwankungen.')},
  bio:{n:TR('Bio-Lieferant'),d:TR('30 Tage lang 35 % teurer. Gäste zahlen 8 % mehr, sind zufriedener und werden eher Stammkunden.')}};
export const PERKS=[
 {id:'kapital',n:TR('Startkapital'),d:TR('+500 € beim nächsten Start'),max:10,cost:2},
 {id:'personal',n:TR('Kontakte in die Branche'),d:TR('Bewerber sind im Schnitt besser'),max:5,cost:3},
 {id:'einkauf',n:TR('Gute Lieferanten'),d:TR('−3 % Einkaufspreis'),max:5,cost:3},
 {id:'name',n:TR('Bekannter Name'),d:TR('+8 Ruf für neue Betriebe, +10 % neue Stammkunden'),max:5,cost:3},
 {id:'miete',n:TR('Verhandlungsgeschick'),d:TR('−4 % Miete'),max:5,cost:4},
 {id:'verwaltung',n:TR('Verwaltungserfahrung'),d:TR('−10 % Verwaltungskosten'),max:5,cost:4},
 {id:'truck',n:TR('Schnellstart'),d:TR('Du startest mit einem Foodtruck'),max:1,cost:8}
];
export const MKT=[{n:TR('Keins'),f:1,c:0},{n:TR('Flyer'),f:1.15,c:20},{n:TR('Lokal'),f:1.3,c:55},{n:TR('Kampagne'),f:1.5,c:130}];
