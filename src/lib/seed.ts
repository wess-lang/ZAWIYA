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
      name: "Olive & Oak",
      tagline: "Comfortable upholstered furniture for family homes",
      city: "Amman",
      accent: "#6B7A4F",
      styleTags: ["upholstered", "family", "classic-modern", "mid-range"],
      ownerName: "Bushra Nizami",
      ownerEmail: "oliveoak@zawiya.jo",
    },
    {
      name: "Nordic Nook",
      tagline: "Flat-pack Scandinavian essentials, built for small spaces",
      city: "Amman",
      accent: "#3E6F6B",
      styleTags: ["scandinavian", "minimalist", "budget", "functional"],
      ownerName: "Hashem Alalem",
      ownerEmail: "nordicnook@zawiya.jo",
    },
    {
      name: "Terra & Thread",
      tagline: "Artisan pieces in natural wood, linen and rattan",
      city: "Amman",
      accent: "#A6763E",
      styleTags: ["boutique", "natural", "artisan", "earthy"],
      ownerName: "Sondos Fraihat",
      ownerEmail: "terrathread@zawiya.jo",
    },
    {
      name: "Aurum House",
      tagline: "Statement furniture with gold accents and bold shapes",
      city: "Amman",
      accent: "#B8860B",
      styleTags: ["luxury", "modern", "statement", "gold-accent"],
      ownerName: "Layla Qassem",
      ownerEmail: "aurumhouse@zawiya.jo",
    },
    {
      name: "Qasr Heritage",
      tagline: "Classic carved-wood furniture rooted in regional craft",
      city: "Irbid",
      accent: "#6B3F2A",
      styleTags: ["traditional", "carved-wood", "heritage", "formal"],
      ownerName: "Omar Shahin",
      ownerEmail: "qasrheritage@zawiya.jo",
    },
    {
      name: "Rawabi Home",
      tagline: "A wide-selection home retailer with accessible prices across every room",
      city: "Amman",
      accent: "#2C5F8A",
      styleTags: ["mainstream", "wide-selection", "accessible", "value", "family"],
      ownerName: "Maher Zyoud",
      ownerEmail: "rawabihome@zawiya.jo",
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
    // Olive & Oak
    {
      shopId: byName("Olive & Oak"),
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
      shopId: byName("Olive & Oak"),
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
      shopId: byName("Olive & Oak"),
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
      shopId: byName("Olive & Oak"),
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
    // Nordic Nook
    {
      shopId: byName("Nordic Nook"),
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
      shopId: byName("Nordic Nook"),
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
      shopId: byName("Nordic Nook"),
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
      shopId: byName("Nordic Nook"),
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
    // Terra & Thread
    {
      shopId: byName("Terra & Thread"),
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
      shopId: byName("Terra & Thread"),
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
      shopId: byName("Terra & Thread"),
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
      shopId: byName("Terra & Thread"),
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
      shopId: byName("Terra & Thread"),
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
    // Aurum House
    {
      shopId: byName("Aurum House"),
      name: "Aurum Velvet Sofa",
      category: "sofa",
      price: 720,
      stock: 3,
      styleTags: ["luxury", "modern", "statement", "gold-accent"],
      colorTags: ["emerald", "gold"],
      roomTags: ["living room"],
      dimensions: "220 x 95 x 85 cm",
      description:
        "An emerald velvet sofa on polished gold-finish legs, built as a statement centerpiece.",
    },
    {
      shopId: byName("Aurum House"),
      name: "Midas Accent Chair",
      category: "chair",
      price: 280,
      stock: 7,
      styleTags: ["luxury", "modern", "gold-accent"],
      colorTags: ["blush", "gold"],
      roomTags: ["living room", "bedroom"],
      dimensions: "70 x 75 x 90 cm",
      description:
        "A curved blush-velvet accent chair with a sculptural gold-finish frame.",
    },
    {
      shopId: byName("Aurum House"),
      name: "Nova Marble Dining Table",
      category: "dining",
      price: 980,
      stock: 2,
      styleTags: ["luxury", "modern", "statement", "gold-accent"],
      colorTags: ["white marble", "gold"],
      roomTags: ["dining room"],
      dimensions: "220 x 100 x 75 cm",
      description:
        "A white marble-top dining table on a gold-finish pedestal base, seats eight.",
    },
    {
      shopId: byName("Aurum House"),
      name: "Halo Chandelier",
      category: "lighting",
      price: 340,
      stock: 4,
      styleTags: ["luxury", "statement", "gold-accent"],
      colorTags: ["gold", "crystal"],
      roomTags: ["dining room", "living room", "entryway"],
      dimensions: "70 x 70 x 50 cm",
      description:
        "A circular chandelier in brushed gold with clustered crystal drops.",
    },
    {
      shopId: byName("Aurum House"),
      name: "Gilded Arch Mirror",
      category: "decor",
      price: 95,
      stock: 11,
      styleTags: ["luxury", "modern", "gold-accent"],
      colorTags: ["gold"],
      roomTags: ["entryway", "living room", "bedroom"],
      dimensions: "70 x 5 x 160 cm",
      description:
        "A tall arched mirror in a brushed-gold frame, sized for an entryway or over a dresser.",
    },
    // Qasr Heritage
    {
      shopId: byName("Qasr Heritage"),
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
      shopId: byName("Qasr Heritage"),
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
      shopId: byName("Qasr Heritage"),
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
      shopId: byName("Qasr Heritage"),
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
    // Rawabi Home
    {
      shopId: byName("Rawabi Home"),
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
      shopId: byName("Rawabi Home"),
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
      shopId: byName("Rawabi Home"),
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
      shopId: byName("Rawabi Home"),
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
      shopId: byName("Rawabi Home"),
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
