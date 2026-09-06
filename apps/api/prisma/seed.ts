// Creates one restaurant with a lunch slot, one table, and a small menu -
// just enough to exercise the whole flow: QR landing -> menu -> demand
// badge -> checkout -> admin dashboard.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const restaurant = await prisma.restaurant.upsert({
    where: { slug: "demo-restaurant" },
    update: {},
    create: {
      name: "Demo Restaurant",
      slug: "demo-restaurant",
      timezone: "Asia/Kolkata"
    }
  });

  // Cutoff set far in the future relative to "now" isn't guaranteed here since
  // this is static seed data - see the note printed at the end of this script
  // for how to adjust it if your test order gets rejected as past cutoff.
  const lunch = await prisma.mealSlot.create({
    data: {
      restaurantId: restaurant.id,
      name: "lunch",
      startTime: "12:00",
      endTime: "23:59",
      cutoffMinutes: 0
    }
  });

  const table = await prisma.tableLocation.create({
    data: {
      restaurantId: restaurant.id,
      label: "Table 4",
      qrCodeValue: "table-4"
    }
  });

  const mains = await prisma.menuCategory.create({
    data: { restaurantId: restaurant.id, name: "Mains", sortOrder: 0 }
  });

  await prisma.menuItem.createMany({
    data: [
      { categoryId: mains.id, name: "Paneer Tikka", description: "Chargrilled cottage cheese", price: 220 },
      { categoryId: mains.id, name: "Butter Chicken", description: "With basmati rice", price: 280 },
      { categoryId: mains.id, name: "Dal Makhani", description: "Slow-cooked black lentils", price: 180 }
    ]
  });

  console.log("Seeded:");
  console.log(`  restaurant slug: ${restaurant.slug}`);
  console.log(`  table id: ${table.id}`);
  console.log(`  meal slot id: ${lunch.id}`);
  console.log("");
  console.log(`  Customer app URL: http://localhost:3000/r/${restaurant.slug}/t/${table.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
