import bcrypt from "bcryptjs";
import { newId } from "./id";
import { writeProductArt } from "./productArt";
import type { Database, Product, Shop, User } from "./types";

/**
 * Builds the initial ZAWIYA dataset. This is placeholder data for a
 * graduation-project prototype, not a real integration with any
 * furniture retailer in Jordan - see the top-level README for why.
 */
export function buildSeed(): Database {
  const now = new Date().toISOString();
  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  const admin: User = {
    id: newId("usr"),
    name: "ZAWIYA Admin",
    email: "admin@zawiya.jo",
    passwordHash: hash("admin123"),
    role: "admin",
    createdAt: now,
  };

  const customer: User = {
    id: newId("usr"),
    name: "Rana Khalil",
    email: "customer@zawiya.jo",
    passwordHash: hash("customer123"),
    role: "customer",
    createdAt: now,
  };

  const shopOwnerDefs = [
    {
      name: "Ashley Furniture HomeStore",
      tagline: "Comfortable upholstered furniture for family homes",
      city: "Amman",
      accent: "#6B7A4F",
      styleTags: ["upholstered", "family", "classic-modern", "mid-range"],
      ownerName: "Bushra Nizami",
      ownerEmail: "ashley@zawiya.jo",
    },
    {
      name: "IKEA",
      tagline: "Flat-pack Scandinavian essentials, built for small spaces",
      city: "Amman",
      accent: "#3E6F6B",
      styleTags: ["scandinavian", "minimalist", "budget", "functional"],
      ownerName: "Hashem Alalem",
      ownerEmail: "ikea@zawiya.jo",
    },
    {
      name: "Marina Home Interiors",
      tagline: "Eclectic boutique pieces in natural wood, linen and rattan",
      city: "Amman",
      accent: "#A6763E",
      styleTags: ["boutique", "natural", "artisan", "earthy"],
      ownerName: "Sondos Fraihat",
      ownerEmail: "marinahome@zawiya.jo",
    },
    {
      name: "Decoration One",
      tagline: "Statement furniture and decor with bold, modern shapes",
      city: "Amman",
      accent: "#B8860B",
      styleTags: ["luxury", "modern", "statement", "gold-accent"],
      ownerName: "Layla Qassem",
      ownerEmail: "decorationone@zawiya.jo",
    },
    {
      name: "Shahwan Furniture",
      tagline: "A long-established Amman furniture house, rooted in regional craft since 1989",
      city: "Amman",
      accent: "#6B3F2A",
      styleTags: ["traditional", "carved-wood", "heritage", "formal"],
      ownerName: "Omar Shahin",
      ownerEmail: "shahwan@zawiya.jo",
    },
    {
      name: "Home Centre",
      tagline: "A wide-selection home retailer with accessible prices across every room",
      city: "Amman",
      accent: "#2C5F8A",
      styleTags: ["mainstream", "wide-selection", "accessible", "value", "family"],
      ownerName: "Maher Zyoud",
      ownerEmail: "homecentre@zawiya.jo",
    },
    {
      name: "Midas Home & Office Furniture",
      tagline: "Functional furniture for home and office, built for everyday use",
      city: "Amman",
      accent: "#7A4F6B",
      styleTags: ["functional", "office", "mid-range", "practical"],
      ownerName: "Fadi Qutaishat",
      ownerEmail: "midas@zawiya.jo",
    },
  ];

  const owners: User[] = shopOwnerDefs.map((d) => ({
    id: newId("usr"),
    name: d.ownerName,
    email: d.ownerEmail,
    passwordHash: hash("shopowner123"),
    role: "shop_owner" as const,
    createdAt: now,
  }));

  const shops: Shop[] = shopOwnerDefs.map((d, i) => ({
    id: newId("shop"),
    ownerId: owners[i].id,
    name: d.name,
    tagline: d.tagline,
    city: d.city,
    accent: d.accent,
    styleTags: d.styleTags,
    status: "active" as const,
    createdAt: now,
  }));

  const byName = (n: string) => shops.find((s) => s.name === n)!.id;

  const productDefs: Omit<Product, "id" | "image">[] = [
    // Ashley Furniture HomeStore
    {
      shopId: byName("Ashley Furniture HomeStore"),
      name: "Marrak 3-Seater Sofa",
      category: "sofa",
      price: 480,
      stock: 6,
      styleTags: ["upholstered", "classic-modern", "family"],
      colorTags: ["grey", "charcoal"],
      roomTags: ["living room"],
      dimensions: "210 x 90 x 85 cm",
      description:
        "A deep, family-friendly sofa in stain-resistant grey weave fabric, with soft rolled arms and solid beech legs.",
    },
    {
      shopId: byName("Ashley Furniture HomeStore"),
      name: "Haya Recliner Armchair",
      category: "chair",
      price: 220,
      stock: 10,
      styleTags: ["upholstered", "family", "mid-range"],
      colorTags: ["beige", "tan"],
      roomTags: ["living room"],
      dimensions: "80 x 95 x 100 cm",
      description:
        "A one-touch reclining armchair in warm beige fabric, built for everyday use.",
    },
    {
      shopId: byName("Ashley Furniture HomeStore"),
      name: "Cedar Dining Set (6-seat)",
      category: "dining",
      price: 650,
      stock: 3,
      styleTags: ["classic-modern", "family"],
      colorTags: ["walnut", "brown"],
      roomTags: ["dining room"],
      dimensions: "180 x 95 x 75 cm",
      description:
        "A solid walnut-finish dining table with six upholstered chairs, sized for a family dining room.",
    },
    {
      shopId: byName("Ashley Furniture HomeStore"),
      name: "Layla Storage Ottoman",
      category: "storage",
      price: 85,
      stock: 14,
      styleTags: ["upholstered", "family"],
      colorTags: ["grey"],
      roomTags: ["living room", "bedroom"],
      dimensions: "60 x 40 x 40 cm",
      description:
        "A hinged-top ottoman that doubles as extra seating and hidden storage.",
    },
    // IKEA
    {
      shopId: byName("IKEA"),
      name: "Fjord 2-Seater Sofa",
      category: "sofa",
      price: 320,
      stock: 8,
      styleTags: ["scandinavian", "minimalist", "budget"],
      colorTags: ["light grey", "oak"],
      roomTags: ["living room"],
      dimensions: "160 x 80 x 78 cm",
      description:
        "A compact two-seater in light grey fabric on slim oak legs, made for small living rooms.",
    },
    {
      shopId: byName("IKEA"),
      name: "Birk Study Desk",
      category: "office",
      price: 110,
      stock: 12,
      styleTags: ["scandinavian", "minimalist", "functional"],
      colorTags: ["light oak", "white"],
      roomTags: ["office", "bedroom"],
      dimensions: "110 x 50 x 75 cm",
      description:
        "A narrow desk in light oak veneer with a single drawer, built to fit against a wall.",
    },
    {
      shopId: byName("IKEA"),
      name: "Nord Bed Frame (Queen)",
      category: "bed",
      price: 240,
      stock: 5,
      styleTags: ["scandinavian", "minimalist"],
      colorTags: ["white", "oak"],
      roomTags: ["bedroom"],
      dimensions: "160 x 200 x 90 cm",
      description:
        "A low-profile queen bed frame in white-washed oak with an upholstered headboard panel.",
    },
    {
      shopId: byName("IKEA"),
      name: "Lyss Floor Lamp",
      category: "lighting",
      price: 45,
      stock: 20,
      styleTags: ["scandinavian", "minimalist", "budget"],
      colorTags: ["white", "oak"],
      roomTags: ["living room", "bedroom", "office"],
      dimensions: "35 x 35 x 150 cm",
      description:
        "A simple arched floor lamp with a fabric shade and an oak dowel base.",
    },
    // Marina Home Interiors
    {
      shopId: byName("Marina Home Interiors"),
      name: "Olive Branch Rattan Armchair",
      category: "chair",
      price: 150,
      stock: 9,
      styleTags: ["boutique", "natural", "artisan", "earthy"],
      colorTags: ["natural", "tan"],
      roomTags: ["living room", "outdoor"],
      dimensions: "75 x 80 x 95 cm",
      description:
        "A hand-woven rattan armchair with a cream cushion, equally at home indoors or on a covered balcony.",
    },
    {
      shopId: byName("Marina Home Interiors"),
      name: "Terra Linen Sofa",
      category: "sofa",
      price: 410,
      stock: 5,
      styleTags: ["boutique", "natural", "earthy"],
      colorTags: ["terracotta", "rust"],
      roomTags: ["living room"],
      dimensions: "200 x 88 x 82 cm",
      description:
        "A relaxed-fit sofa upholstered in heavyweight terracotta linen over a solid pine frame.",
    },
    {
      shopId: byName("Marina Home Interiors"),
      name: "Grove Oak Dining Table",
      category: "dining",
      price: 390,
      stock: 4,
      styleTags: ["boutique", "natural", "artisan"],
      colorTags: ["raw oak", "natural"],
      roomTags: ["dining room"],
      dimensions: "190 x 90 x 75 cm",
      description:
        "A live-edge oak dining table that seats six, finished with natural oil to show the grain.",
    },
    {
      shopId: byName("Marina Home Interiors"),
      name: "Clay Pendant Light",
      category: "lighting",
      price: 60,
      stock: 15,
      styleTags: ["boutique", "natural", "earthy"],
      colorTags: ["terracotta"],
      roomTags: ["dining room", "living room"],
      dimensions: "30 x 30 x 25 cm",
      description:
        "A hand-thrown ceramic pendant shade in warm terracotta, for over a dining table or reading nook.",
    },
    {
      shopId: byName("Marina Home Interiors"),
      name: "Courtyard Rattan Lounge Set",
      category: "outdoor",
      price: 280,
      stock: 6,
      styleTags: ["boutique", "natural", "earthy"],
      colorTags: ["natural", "cream"],
      roomTags: ["outdoor", "balcony"],
      dimensions: "150 x 70 x 70 cm",
      description:
        "A two-seat rattan lounge set with a low table, weather-resistant and built for a balcony or courtyard.",
    },
    // Decoration One - the real shop's own focus is Islamic art and
    // calligraphy reinterpreted as modern home decor and ornaments
    // (founded 2010, Amman), not generic gold-accent furniture - this
    // line was rewritten to match that after the earlier placeholder
    // products (inherited from a renamed shop) didn't fit.
    {
      shopId: byName("Decoration One"),
      name: "Andalusia Calligraphy Wall Panel",
      category: "decor",
      price: 65,
      stock: 14,
      styleTags: ["oriental", "calligraphy", "islamic-art", "modern"],
      colorTags: ["gold", "black"],
      roomTags: ["living room", "entryway"],
      dimensions: "60 x 2 x 90 cm",
      description:
        "A laser-cut metal wall panel in a modern Thuluth calligraphy design, finished in brushed gold.",
    },
    {
      shopId: byName("Decoration One"),
      name: "Manara Lantern Pendant",
      category: "lighting",
      price: 165,
      stock: 6,
      styleTags: ["oriental", "ornamental", "warm"],
      colorTags: ["gold", "amber"],
      roomTags: ["dining room", "living room", "entryway"],
      dimensions: "35 x 35 x 55 cm",
      description:
        "A pierced-metal lantern pendant in the Manara style, casting a patterned amber glow.",
    },
    {
      shopId: byName("Decoration One"),
      name: "Arabesque Console Table",
      category: "storage",
      price: 260,
      stock: 5,
      styleTags: ["oriental", "ornamental", "modern"],
      colorTags: ["dark wood", "gold"],
      roomTags: ["entryway", "living room"],
      dimensions: "120 x 35 x 80 cm",
      description:
        "A console table with an inlaid arabesque-pattern front panel and brushed-gold hardware.",
    },
    {
      shopId: byName("Decoration One"),
      name: "Thuluth Script Accent Chair",
      category: "chair",
      price: 230,
      stock: 6,
      styleTags: ["oriental", "calligraphy", "islamic-art"],
      colorTags: ["deep red", "gold"],
      roomTags: ["living room"],
      dimensions: "70 x 75 x 90 cm",
      description:
        "An accent chair upholstered in a jacquard fabric woven with a calligraphic Thuluth script motif.",
    },
    {
      shopId: byName("Decoration One"),
      name: "Resin Ornament Centerpiece Set",
      category: "decor",
      price: 42,
      stock: 20,
      styleTags: ["oriental", "ornamental", "warm"],
      colorTags: ["gold", "white marble"],
      roomTags: ["dining room", "living room"],
      dimensions: "25 x 25 x 15 cm",
      description:
        "A set of three hand-finished resin ornaments with gold-leaf detailing, for a dining table or console.",
    },
    // Shahwan Furniture
    {
      shopId: byName("Shahwan Furniture"),
      name: "Hashemite Carved Sofa",
      category: "sofa",
      price: 560,
      stock: 3,
      styleTags: ["traditional", "carved-wood", "heritage", "formal"],
      colorTags: ["deep red", "dark wood"],
      roomTags: ["living room", "majlis"],
      dimensions: "230 x 90 x 95 cm",
      description:
        "A formal sofa with hand-carved dark wood trim and deep red upholstery, in a regional majlis style.",
    },
    {
      shopId: byName("Shahwan Furniture"),
      name: "Majlis Carved Armchair",
      category: "chair",
      price: 240,
      stock: 6,
      styleTags: ["traditional", "carved-wood", "heritage"],
      colorTags: ["maroon", "dark wood"],
      roomTags: ["living room", "majlis"],
      dimensions: "80 x 85 x 100 cm",
      description:
        "A single armchair matching the Hashemite line, with the same carved wood and maroon velvet.",
    },
    {
      shopId: byName("Shahwan Furniture"),
      name: "Heritage Carved Dining Table (8-seat)",
      category: "dining",
      price: 890,
      stock: 2,
      styleTags: ["traditional", "carved-wood", "heritage", "formal"],
      colorTags: ["dark walnut"],
      roomTags: ["dining room"],
      dimensions: "240 x 100 x 76 cm",
      description:
        "A long carved-walnut dining table for eight, with matching high-back carved chairs.",
    },
    {
      shopId: byName("Shahwan Furniture"),
      name: "Qasr Carved Console",
      category: "storage",
      price: 310,
      stock: 5,
      styleTags: ["traditional", "carved-wood", "heritage"],
      colorTags: ["dark wood", "gold"],
      roomTags: ["entryway", "living room"],
      dimensions: "140 x 40 x 85 cm",
      description:
        "An entryway console with ornate carved wood detailing and brass hardware.",
    },
    // Home Centre
    {
      shopId: byName("Home Centre"),
      name: "Everyday 3-Seater Sofa",
      category: "sofa",
      price: 265,
      stock: 10,
      styleTags: ["mainstream", "value", "family"],
      colorTags: ["grey", "beige"],
      roomTags: ["living room"],
      dimensions: "195 x 85 x 80 cm",
      description:
        "A no-fuss three-seater in easy-clean fabric, built for everyday family use at an accessible price.",
    },
    {
      shopId: byName("Home Centre"),
      name: "Family Dining Set (6-seat)",
      category: "dining",
      price: 340,
      stock: 6,
      styleTags: ["mainstream", "value", "family"],
      colorTags: ["oak", "white"],
      roomTags: ["dining room"],
      dimensions: "170 x 90 x 75 cm",
      description:
        "A sturdy, budget-friendly dining table with six chairs, sized for a family of five or six.",
    },
    {
      shopId: byName("Home Centre"),
      name: "3-Door Wardrobe",
      category: "storage",
      price: 195,
      stock: 8,
      styleTags: ["mainstream", "wide-selection", "functional"],
      colorTags: ["white", "oak"],
      roomTags: ["bedroom"],
      dimensions: "150 x 55 x 200 cm",
      description:
        "A spacious three-door wardrobe with a hanging rail and shelving, finished in a light oak laminate.",
    },
    {
      shopId: byName("Home Centre"),
      name: "Essentials Bed Frame (Double)",
      category: "bed",
      price: 150,
      stock: 9,
      styleTags: ["mainstream", "value", "functional"],
      colorTags: ["grey", "charcoal"],
      roomTags: ["bedroom"],
      dimensions: "140 x 190 x 85 cm",
      description:
        "A simple upholstered double bed frame with a padded headboard, built for everyday durability.",
    },
    {
      shopId: byName("Home Centre"),
      name: "Desk Lamp & Shelf Combo",
      category: "lighting",
      price: 38,
      stock: 16,
      styleTags: ["mainstream", "functional", "budget"],
      colorTags: ["white", "grey"],
      roomTags: ["office", "bedroom"],
      dimensions: "40 x 20 x 45 cm",
      description:
        "An adjustable desk lamp with a built-in shelf for books or a phone, in a simple matte finish.",
    },
    // Midas Home & Office Furniture
    {
      shopId: byName("Midas Home & Office Furniture"),
      name: "Executive L-Shape Desk",
      category: "office",
      price: 260,
      stock: 6,
      styleTags: ["functional", "office", "mid-range"],
      colorTags: ["dark walnut", "charcoal"],
      roomTags: ["office"],
      dimensions: "160 x 140 x 75 cm",
      description:
        "A corner-fit L-shape desk in dark walnut laminate with a built-in cable channel, sized for a home office.",
    },
    {
      shopId: byName("Midas Home & Office Furniture"),
      name: "Flex Mesh Office Chair",
      category: "chair",
      price: 95,
      stock: 15,
      styleTags: ["functional", "office", "practical"],
      colorTags: ["charcoal", "grey"],
      roomTags: ["office"],
      dimensions: "65 x 65 x 115 cm",
      description:
        "An adjustable mesh-back office chair with lumbar support, built for long workdays.",
    },
    {
      shopId: byName("Midas Home & Office Furniture"),
      name: "Modular Filing Bookshelf",
      category: "storage",
      price: 130,
      stock: 10,
      styleTags: ["functional", "office", "practical"],
      colorTags: ["oak", "white"],
      roomTags: ["office", "living room"],
      dimensions: "80 x 35 x 180 cm",
      description:
        "An open-shelf unit with one lockable filing drawer, equally useful in a home office or living room.",
    },
    {
      shopId: byName("Midas Home & Office Furniture"),
      name: "Task Desk Lamp",
      category: "lighting",
      price: 28,
      stock: 22,
      styleTags: ["functional", "office", "practical"],
      colorTags: ["charcoal"],
      roomTags: ["office"],
      dimensions: "20 x 20 x 48 cm",
      description:
        "An adjustable-arm LED task lamp with a dimmer switch, for a desk or workbench.",
    },
  ];

  const accentByShopId = new Map(shops.map((s) => [s.id, s.accent]));
  const products: Product[] = productDefs.map((p) => {
    const id = newId("prod");
    const accent = accentByShopId.get(p.shopId) ?? "#6B7A4F";
    const image = writeProductArt(id, p.category, p.colorTags, accent);
    return { ...p, id, image };
  });

  // One shop left pending so the Admin > Shop Approvals screen has
  // something to review out of the box (Scenario 5, Section 4.3).
  const pendingOwner: User = {
    id: newId("usr"),
    name: "Dana Masri",
    email: "pendingshop@zawiya.jo",
    passwordHash: hash("shopowner123"),
    role: "shop_owner",
    createdAt: now,
  };
  const pendingShop: Shop = {
    id: newId("shop"),
    ownerId: pendingOwner.id,
    name: "Balad Botanicals",
    tagline: "Plant stands, planters and greenery-ready furniture",
    city: "Amman",
    accent: "#4C7A3D",
    styleTags: ["botanical", "natural", "minimalist"],
    status: "pending",
    createdAt: now,
  };

  return {
    users: [admin, customer, ...owners, pendingOwner],
    addresses: [
      {
        id: newId("addr"),
        userId: customer.id,
        label: "Home",
        city: "Amman",
        details: "Wasfi Al-Tal Street, Building 42, 4th Floor",
      },
    ],
    shops: [...shops, pendingShop],
    products,
    reviews: [],
    wishlist: [],
    orders: [],
    roomScans: [],
  };
}
