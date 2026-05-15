const IMAGE_BASE_URL = "https://assets.vsantele.dev/max-la-menace/";

// The real Max. The user reserved the first photo for the monster itself.
// Modeled as an array so future stages can introduce additional monster faces
// without changing the call sites.
export const MONSTER_IMAGES = ["630338232_931897789471136_4207333098432554165_n.webp"] as const;

// Photographs of "the haunted family" — used as small portraits set into a
// subset of decoy graves in stage 1, and as paintings on the walls in stage 2.
// Same engine, different role.
export const DECORATION_IMAGES = [
  "664917144_1273822464942680_3987235743782405967_n.webp",
  "666795310_966757035968146_1952891325468904096_n.webp",
  "667729503_1499438165151950_4202747074792575450_n.webp",
  "669224354_1469425571598726_3407431813859507401_n.webp",
  "670351903_2443006889473697_2324898681123588283_n.webp",
  "673910766_731526813355267_6393861459914108232_n.webp",
  "673974329_27181267188148545_7713993385618598824_n.webp",
  "673976042_2704641936577409_2153657903108132149_n.webp",
  "677782745_1469862471587841_3754085494705504405_n.webp",
  "688446148_3175170136024230_5522286675424272482_n.webp",
  "692785760_1002345989403552_2019912183830046079_n.webp",
  "695144042_2246237409244688_1788944399834040226_n.webp",
  "696245089_982567914391399_3740096426539123437_n.webp",
  "700096461_3609486015866450_8882131152313670712_n.webp",
  "701686399_1304011808608664_3096812119629018600_n.webp",
] as const;

const pick = (pool: ReadonlyArray<string>): string => {
  if (pool.length === 0) {
    throw new Error("image pool is empty");
  }
  const index = Math.floor(Math.random() * pool.length);
  const filename = pool[index];
  if (filename === undefined) {
    throw new Error("image pool index out of range");
  }
  return IMAGE_BASE_URL + filename;
};

export const getRandomMonsterImageUrl = (): string => pick(MONSTER_IMAGES);

export const getRandomDecorationImageUrl = (): string => pick(DECORATION_IMAGES);

// Deterministic decoration picker (used to seed grave portraits at stage start
// so the same grave always shows the same face for the run).
export const getDecorationImageUrl = (index: number): string => {
  const pool = DECORATION_IMAGES;
  const filename = pool[index % pool.length];
  if (filename === undefined) {
    throw new Error("decoration pool unexpectedly empty");
  }
  return IMAGE_BASE_URL + filename;
};
