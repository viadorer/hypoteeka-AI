/**
 * Vokativ (5. pád) českých křestních jmen.
 * Používá se na welcome screenu pro oslovení vracejícího se klienta.
 */

const MALE: Record<string, string> = {
  Adam: 'Adame', Alan: 'Alane', Albert: 'Alberte', Aleš: 'Aleši', Alexandr: 'Alexandre',
  Antonín: 'Antoníne', Arnošt: 'Arnošte',
  Bedřich: 'Bedřichu', Benjamin: 'Benjamine', Bohdan: 'Bohdane', Bohumil: 'Bohumile',
  Dalibor: 'Dalibore', Daniel: 'Danieli', David: 'Davide', Denis: 'Denisi', Dominik: 'Dominiku', Dušan: 'Dušane',
  Eduard: 'Eduarde', Emil: 'Emile', Erik: 'Eriku',
  Filip: 'Filipe', František: 'Františku',
  Gabriel: 'Gabrieli', Gustav: 'Gustave',
  Hynek: 'Hynku',
  Igor: 'Igore', Ivan: 'Ivane',
  Jakub: 'Jakube', Jan: 'Jane', Jaromír: 'Jaromíre', Jaroslav: 'Jaroslave',
  Jindřich: 'Jindřichu', Jiří: 'Jiří', Josef: 'Josefe',
  Kamil: 'Kamile', Karel: 'Karle', Kryštof: 'Kryštofe',
  Ladislav: 'Ladislave', Libor: 'Libore', Lubomír: 'Lubomíre', Luboš: 'Luboši',
  Luděk: 'Luďku', Ludvík: 'Ludvíku', Lukáš: 'Lukáši',
  Marcel: 'Marceli', Marek: 'Marku', Martin: 'Martine', Matěj: 'Matěji',
  Michal: 'Michale', Mikuláš: 'Mikuláši', Milan: 'Milane', Miloš: 'Miloši',
  Miroslav: 'Miroslave',
  Nikolas: 'Nikolasi', Norbert: 'Norberte',
  Oldřich: 'Oldřichu', Ondřej: 'Ondřeji', Oskar: 'Oskare', Oto: 'Oto',
  Patrik: 'Patriku', Pavel: 'Pavle', Petr: 'Petře', Přemysl: 'Přemysle',
  Radek: 'Radku', Richard: 'Richarde', Robert: 'Roberte', Roman: 'Romane',
  Samuel: 'Samueli', Stanislav: 'Stanislave', Šimon: 'Šimone', Štěpán: 'Štěpáne',
  Tadeáš: 'Tadeáši', Tomáš: 'Tomáši',
  Václav: 'Václave', Viktor: 'Viktore', Vilém: 'Viléme', Vít: 'Víte',
  Vladimír: 'Vladimíre', Vojtěch: 'Vojtěchu', Vratislav: 'Vratislave',
  Zbyněk: 'Zbyňku', Zdeněk: 'Zdeňku',
};

const FEMALE: Record<string, string> = {
  Adéla: 'Adélo', Alena: 'Aleno', Alexandra: 'Alexandro', Alice: 'Alice',
  Andrea: 'Andreo', Aneta: 'Aneto', Anežka: 'Anežko', Anna: 'Anno',
  Barbora: 'Barboro', Blanka: 'Blanko', Božena: 'Boženo',
  Dana: 'Dano', Daniela: 'Danielo', Denisa: 'Deniso', Dominika: 'Dominiko',
  Eliška: 'Eliško', Eva: 'Evo',
  Gabriela: 'Gabrielo',
  Hana: 'Hano', Helena: 'Heleno',
  Irena: 'Ireno', Ivana: 'Ivano', Iveta: 'Iveto',
  Jana: 'Jano', Jarmila: 'Jarmilo', Jiřina: 'Jiřino', Jitka: 'Jitko',
  Kamila: 'Kamilo', Karolína: 'Karolíno', Kateřina: 'Kateřino', Klára: 'Kláro',
  Kristýna: 'Kristýno',
  Lenka: 'Lenko', Lucie: 'Lucie', Ludmila: 'Ludmilo',
  Marcela: 'Marcelo', Marie: 'Marie', Markéta: 'Markéto', Marta: 'Marto',
  Martina: 'Martino', Michaela: 'Michaelo', Milena: 'Mileno', Monika: 'Moniko',
  Natálie: 'Natálie', Nela: 'Nelo', Nicole: 'Nicole',
  Olga: 'Olgo',
  Pavla: 'Pavlo', Pavlína: 'Pavlíno', Petra: 'Petro',
  Radka: 'Radko', Renáta: 'Renáto',
  Sabina: 'Sabino', Simona: 'Simono', Soňa: 'Soňo',
  Šárka: 'Šárko', Štěpánka: 'Štěpánko',
  Tereza: 'Terezo',
  Vendula: 'Vendulo', Věra: 'Věro', Veronika: 'Veroniko',
  Zuzana: 'Zuzano',
};

const ALL = { ...MALE, ...FEMALE };

export function toVocative(name: string): string {
  const trimmed = name.trim();
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  return ALL[capitalized] ?? ALL[trimmed] ?? trimmed;
}
