// Only literal ingredient or explicitly named family images are mapped here.
// Unknown notes and abstract accords intentionally have no ingredient photograph.
const photoAliases: Record<string, string[]> = {
  "grapefruit": [
    "grapefruit"
  ],
  "pear": [
    "pear"
  ],
  "cinnamon": [
    "cinnamon"
  ],
  "orange-blossom": [
    "orange blossom",
    "orange flower",
    "tunisian orange blossom",
    "moroccan orange blossom",
    "tunisian neroli",
    "neroli"
  ],
  "raspberry": [
    "raspberry"
  ],
  "sage": [
    "sage",
    "clary sage"
  ],
  "honey": [
    "honey"
  ],
  "vetiver": [
    "vetiver",
    "haitian vetiver"
  ],
  "pineapple": [
    "pineapple"
  ],
  "ginger": [
    "ginger"
  ],
  "cedar": [
    "cedar",
    "cedarwood",
    "atlas cedarwood",
    "virginia cedar"
  ],
  "iris": [
    "iris",
    "iris powdery"
  ],
  "osmanthus": [
    "osmanthus"
  ],
  "caramel": [
    "caramel"
  ],
  "geranium": [
    "geranium"
  ],
  "mint": [
    "mint"
  ],
  "peony": [
    "peony"
  ],
  "violet": [
    "violet",
    "powdery violet"
  ],
  "gardenia": [
    "gardenia"
  ],
  "blackcurrant": [
    "blackcurrant",
    "black currant",
    "black currant nectar"
  ],
  "coffee-beans": [
    "coffee beans",
    "coffee"
  ],
  "orange": [
    "orange",
    "sicilian orange"
  ],
  "oakmoss": [
    "oakmoss",
    "oak moss",
    "moss"
  ],
  "strawberry": [
    "strawberry"
  ],
  "coconut": [
    "coconut"
  ],
  "guaiac-wood": [
    "guaiac wood"
  ],
  "almond": [
    "almond",
    "sweet almond",
    "bitter almond"
  ],
  "nutmeg": [
    "nutmeg"
  ],
  "violet-leaf": [
    "violet leaf"
  ],
  "mango": [
    "mango"
  ],
  "orris-root": [
    "orris root",
    "orris",
    "orris root"
  ],
  "lime": [
    "lime",
    "kaffir lime"
  ],
  "apple": [
    "apple"
  ],
  "quince": [
    "quince"
  ],
  "heliotrope": [
    "heliotrope"
  ],
  "praline": [
    "praline"
  ],
  "styrax": [
    "styrax"
  ],
  "lychee": [
    "lychee"
  ],
  "amaretto": [
    "amaretto",
    "amaretto"
  ],
  "chestnut": [
    "chestnut"
  ],
  "caraway": [
    "caraway"
  ],
  "black-pepper": [
    "black pepper",
    "pepper",
    "madagascar pepper"
  ],
  "bitter-orange": [
    "bitter orange"
  ],
  "rosemary": [
    "rosemary"
  ],
  "milk": [
    "milk"
  ],
  "cypress": [
    "cypress",
    "cypress oil"
  ],
  "rhubarb": [
    "rhubarb"
  ],
  "juniper-berry": [
    "juniper berry",
    "juniper"
  ],
  "mate": [
    "mate",
    "mate grass"
  ],
  "peach": [
    "peach"
  ],
  "green-apple": [
    "green apple"
  ],
  "plum": [
    "plum"
  ],
  "brown-sugar": [
    "brown sugar"
  ],
  "dried-fruits": [
    "dried fruits"
  ],
  "dates": [
    "dates"
  ],
  "rose-honey": [
    "rose honey"
  ],
  "lemon-verbena": [
    "lemon verbena",
    "verbena"
  ],
  "birch": [
    "birch"
  ],
  "black-truffle": [
    "black truffle"
  ],
  "black-orchid": [
    "black orchid"
  ],
  "chocolate": [
    "chocolate"
  ],
  "water-jasmine": [
    "water jasmine"
  ],
  "white-peach": [
    "white peach"
  ],
  "pistachio": [
    "pistachio"
  ],
  "pimento": [
    "pimento",
    "red pepper (pimento)",
    "allspice"
  ],
  "tiare": [
    "tiare",
    "tiare flower"
  ],
  "mimosa": [
    "mimosa"
  ],
  "immortelle": [
    "immortelle"
  ],
  "hay": [
    "hay"
  ],
  "palo-santo": [
    "palo santo",
    "palo santo wood"
  ],
  "bay-leaf": [
    "bay leaf"
  ],
  "fig": [
    "fig"
  ],
  "hazelnut": [
    "hazelnut"
  ],
  "sweet-pea": [
    "sweet pea"
  ],
  "pear-blossom": [
    "pear blossom"
  ],
  "lily-of-the-valley": [
    "lily of the valley"
  ],
  "cypriol": [
    "cypriol",
    "cypriol (nagarmotha)",
    "nagarmotha"
  ],
  "coconut-powder": [
    "coconut powder"
  ],
  "lily": [
    "lily"
  ],
  "benzoin": [
    "benzoin"
  ],
  "passion-fruit": [
    "passion fruit",
    "passionfruit",
    "passion fruit",
    "passionfruit accord"
  ],
  "cranberry": [
    "cranberry"
  ],
  "ylang-ylang": [
    "ylang ylang",
    "ylang ylang"
  ],
  "fir-resin": [
    "fir resin"
  ],
  "lemon": [
    "lemon",
    "italian lemon",
    "lemon zest"
  ],
  "labdanum": [
    "labdanum",
    "spanish labdanum"
  ],
  "clary-sage": [
    "clary sage"
  ],
  "oolong-tea": [
    "oolong tea"
  ],
  "kulfi": [
    "kulfi"
  ],
  "toffee": [
    "toffee"
  ],
  "whiskey": [
    "whiskey"
  ],
  "narcissus": [
    "narcissus",
    "french narcissus"
  ],
  "licorice": [
    "licorice"
  ],
  "cacao": [
    "cacao",
    "cocoa"
  ],
  "frankincense": [
    "frankincense",
    "olibanum",
    "frankincense (Omani luban)"
  ],
  "cognac": [
    "cognac",
    "cognac accord"
  ],
  "oak-barrel": [
    "oak barrel"
  ],
  "coconut-water": [
    "coconut water"
  ],
  "black-cherry": [
    "black cherry"
  ],
  "peru-balsam": [
    "peru balsam"
  ],
  "marjoram": [
    "marjoram"
  ],
  "lilac": [
    "lilac"
  ],
  "green-tea": [
    "green tea"
  ],
  "magnolia": [
    "magnolia"
  ],
  "bluebell": [
    "bluebell"
  ],
  "papyrus": [
    "papyrus"
  ],
  "petitgrain": [
    "petitgrain"
  ],
  "blood-orange": [
    "blood orange"
  ],
  "frangipani": [
    "frangipani"
  ],
  "rum": [
    "rum"
  ],
  "almond-candy": [
    "almond candy"
  ],
  "ambrette": [
    "ambrette"
  ],
  "rose-water": [
    "rose water"
  ],
  "cocoa-butter": [
    "cocoa butter"
  ],
  "clove": [
    "clove"
  ],
  "myrrh": [
    "myrrh"
  ],
  "ambergris": [
    "ambergris"
  ],
  "linden-blossom": [
    "linden blossom",
    "linden blossom"
  ],
  "white-suede": [
    "white suede"
  ],
  "suede": [
    "suede"
  ],
  "green-mandarin": [
    "green mandarin",
    "green mandarin"
  ],
  "pomelo": [
    "pomelo"
  ],
  "citron": [
    "citron"
  ],
  "kaffir-lime": [
    "kaffir lime",
    "makrut lime"
  ],
  "cumin": [
    "cumin"
  ],
  "coriander": [
    "coriander"
  ],
  "sesame": [
    "sesame"
  ],
  "marshmallow": [
    "marshmallow"
  ],
  "sugar-cane": [
    "sugar cane"
  ],
  "davana": [
    "davana"
  ],
  "elemi": [
    "elemi"
  ],
  "sandalwood-oil": [
    "sandalwood oil"
  ],
  "bergamot": [
    "bergamot",
    "calabrian bergamot",
    "italian bergamot"
  ],
  "sandalwood": [
    "sandalwood",
    "creamy sandalwood"
  ],
  "patchouli": [
    "patchouli"
  ],
  "cardamom": [
    "cardamom",
    "green cardamom"
  ],
  "mandarin": [
    "mandarin",
    "mandarin orange",
    "italian mandarin"
  ],
  "tuberose": [
    "tuberose"
  ],
  "tonka-bean": [
    "tonka bean",
    "tonka",
    "tonka bean",
    "tonka beans"
  ],
  "pink-pepper": [
    "pink pepper",
    "pink peppercorn"
  ],
  "rose": [
    "rose",
    "red rose",
    "damask rose",
    "bulgarian rose",
    "turkish rose",
    "grasse rose",
    "rose de mai",
    "rose absolute"
  ],
  "jasmine": [
    "jasmine",
    "white jasmine",
    "moroccan jasmine"
  ],
  "vanilla": [
    "vanilla",
    "madagascar vanilla",
    "bourbon vanilla",
    "black vanilla",
    "salted vanilla"
  ],
  "saffron": [
    "saffron"
  ],
  "oud": [
    "oud",
    "agarwood (oud)",
    "oud (agarwood)",
    "pure oud (agarwood)",
    "premium oud",
    "oud oil"
  ],
  "lavender": [
    "lavender",
    "lavender extract",
    "french lavender"
  ],
  "leather": [
    "leather",
    "leather accord"
  ],
  "tobacco": [
    "tobacco",
    "tobacco leaf",
    "white tobacco"
  ],
  "woods": [
    "woods",
    "woody",
    "woody notes",
    "white woods",
    "warm woods",
    "smoky woods",
    "light woods",
    "dark woods",
    "creamy woods",
    "smooth woods",
    "modern woods",
    "deep woods",
    "woody accords",
    "soft woods"
  ],
  "citrus": [
    "citrus",
    "rich blend of citrus",
    "spicy citrus",
    "fresh citrus",
    "refined citrus"
  ],
  "floral": [
    "floral",
    "florals",
    "floral notes",
    "white flowers",
    "white florals",
    "soft florals",
    "soft floral",
    "fresh white floral",
    "blooming flowers",
    "floral bouquet",
    "mixed florals"
  ],
  "berries": [
    "berries",
    "red berries",
    "dark berries"
  ],
  "fruit": [
    "fruit",
    "fruits",
    "fruity notes",
    "fruity accords",
    "sweet fruits"
  ],
  "spices": [
    "spices",
    "spicy notes",
    "warm spices",
    "warm spice",
    "warm spicy",
    "aromatic spices",
    "fresh spice"
  ],
  "resins": [
    "resins",
    "incense",
    "smoky resin",
    "smoky resins",
    "resinous",
    "resinous accords"
  ],
  "jasmine-sambac": [
    "jasmine sambac",
    "sambac jasmine",
    "arabian jasmine"
  ],
  "vanilla-orchid": [
    "vanilla orchid"
  ],
  "mushroom": [
    "mushroom"
  ]
};

const photoByNote = new Map<string, string>();
for (const [photo, aliases] of Object.entries(photoAliases)) {
  photoByNote.set(photo, photo);
  for (const alias of aliases) photoByNote.set(alias.toLowerCase(), photo);
}
photoByNote.set("mineral ambergris", "ambergris");
photoByNote.set("floral accord", "floral");
photoByNote.set("red berries", "raspberry");
photoByNote.set("dark berries", "blackcurrant");
for (const note of ["white flowers", "white florals", "fresh white floral"]) {
  photoByNote.set(note, "jasmine");
}

export function getFragranceNoteImage(englishName: string): string | null {
  const photo = photoByNote.get(englishName.trim().toLowerCase());
  return photo ? `/images/fragrance-notes/${photo}.webp` : null;
}
